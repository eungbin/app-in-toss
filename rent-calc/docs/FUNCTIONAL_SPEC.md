# 기능 명세 — rent-calc ("월세 이거 맞아?")

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.3 (2026-09-08) |
| 상위 문서 | [PRD.md](PRD.md) v0.2 — 요구사항 ID(CE-, DT-, UI-, MZ-, US-)는 PRD와 동일 |
| 공용 코드 | [../../docs/SHARED_PACKAGE.md](../../docs/SHARED_PACKAGE.md) `@ait/kit` |
| 적용 범위 | **v1.0 (광고 전용, 서버 없음)**. P1·P2 항목은 `[P1]` `[P2]` 표시 |
| 관련 문서 | 화면 흐름·와이어프레임 ([SCREEN_FLOW.md](SCREEN_FLOW.md)), 계산 검증 기록 ([FACT_CHECK.md](FACT_CHECK.md) — 골든 케이스 37건) |

이 문서는 "무엇을 어떻게 동작시키는가"를 구현 가능한 수준으로 적는다. 화면 배치·비주얼은 SCREEN_FLOW에서 다룬다.

---

## 0. 상수·용어

| 상수 | 값 | 출처 |
|---|---|---|
| `INCREASE_CAP` | 1/20 (5%) | 주택임대차보호법 제7조 제2항 |
| `INCREASE_INTERVAL_DAYS` | 365 | 제7조 제1항 후단 "1년 이내" |
| `CONVERSION_CEILING` | 0.10 | 시행령 제9조 제1항 (연 1할) |
| `CONVERSION_SPREAD` | 0.02 | 시행령 제9조 제2항 (연 2%) |
| `RENT_MULTIPLIER` / `RENT_MULTIPLIER_UNDER_50M` | 100 / 70 | 공인중개사법 시행규칙 제20조 제5항 |
| `RENT_MULTIPLIER_THRESHOLD` | 50,000,000 | 동 조항 |
| `OFFICETEL_AREA_MAX` | 85 (㎡) | 시행규칙 제20조 제4항 |
| `OFFICETEL_OTHER_RATIO` | 0.009 | 동 조항 (협의) |
| `REPORT_DEPOSIT` / `REPORT_RENT` | 60,000,000 / 300,000 | 부동산 거래신고법 시행령 (초과 기준) |
| `REPORT_DAYS` | 30 | 동법 |
| `TIMELINE_YEARS` | 2021 … 현재 연도 (1월 1일) + 최신 | 확정 |
| `SAVED_FREE` / `SAVED_CAP` | 3 / 20 | 확정 |
| `BASERATE_STALE_WARN_DAYS` / `_BLOCK_DAYS` | 90 / 180 | O-5 |
| `DEBOUNCE_MS` | 300 | |
| `SCHEMA_VERSION` | 1 | Storage |

용어: **현재 조건(current)** = 지금 계약의 보증금·월세. **제안 조건(proposed)** = 집주인이 제시한 보증금·월세. **전환율(rate)** = 보증금 1원을 월세로 돌릴 때 연 비율. **법정 전환율(legalRate)** = min(10%, 기준금리 + 2%). **환산보증금(eqDeposit)** = 보증금 + 월세 × 12 ÷ 전환율. **인상률(increase)** = 제안 환산보증금 ÷ 현재 환산보증금 − 1. **판정(verdict)** = `within`(상한 안) / `exceeds`(상한 초과) / `null`(신규 계약). **모드(mode)** = `renew`(갱신·기간 중 변경) / `new`(신규 계약). **게이트** = 리워드 광고로 하루 열리는 기능 묶음(시간축, 저장 초과).

사용자 화면 용어(원칙 B3): "법정 상한", "상한 안", "상한 초과", "참고용 판정". 금지: "위반", "불법", "거절", "받아들이세요", "추천".

---

## 1. 데이터 모델

### 1-1. 기준금리 (`src/data/baserate.json`)

```ts
interface BaseRateFile {
  meta: {
    source: "한국은행 ECOS 722Y001 한국은행 기준금리";
    fetchedAt: string;   // 수집일
    asOf: string;        // 시계열 마지막 날짜 — check:data 신선도 검사 대상
    license: "출처 표시(한국은행 작성 통계)";
    attribution: "출처 : ECOS(한국은행, 한국은행 기준금리), YYYY-MM-DD";
  };
  /** 변동 시점만. from 이후 유효. 오름차순, 첫 항목은 2020-01-01 이전이어야 시간축 2021이 덮인다 */
  changes: { from: string; rate: number /* 0.03 = 3.00% */ }[];
}
```

조회 `rateAt(date): number` = `changes` 중 `from ≤ date`인 마지막 항목. `latest()` = 마지막 항목 + `asOf`.

### 1-2. 중개보수 별표 (`src/data/brokerage.json`)

```ts
interface BrokerageFile {
  meta: { source: "공인중개사법 시행규칙 별표 1·2"; lsiSeq: string; bylSeq: { table1: string; table2: string }; amendedOn: "2021-10-19"; fetchedAt: string };
  /** 별표 1 — 주택. kind별 구간. lo 이상 hi 미만(마지막 hi = Infinity → null) */
  housing: { kind: 'sale' | 'lease'; lo: number; hi: number | null; ratio: number; cap: number | null }[];
  /** 별표 2 — 주거용 오피스텔(조건 충족) */
  officetel: { sale: number /* 0.005 */; lease: number /* 0.004 */ };
}
```

파서 단정: 구간 연속성(이전 hi = 다음 lo), kind별 6행, ratio 0 < r ≤ 0.01, 임대차 첫 두 구간에만 cap.

### 1-3. 조문 상수 (`src/data/legal.json`)

```ts
interface LegalFile {
  items: {
    key: 'increaseCap' | 'increaseIntervalDays' | 'conversionCeiling' | 'conversionSpread' | 'rentMultiplier' | 'rentMultiplierUnder50m' | 'rentMultiplierThreshold' | 'officetelAreaMax' | 'officetelOtherRatio' | 'reportDeposit' | 'reportRent' | 'reportDays';
    value: number;
    law: string;         // "주택임대차보호법 제7조 제2항"
    url: string;         // law.go.kr
    verifiedAt: string;  // "2026-09-08"
  }[];
}
```

0장의 상수는 이 파일에서 로드한다(코드 리터럴 금지 — 테스트가 파일과 0장 값의 일치를 검사).

### 1-4. 런타임 상태

```ts
type Mode = 'renew' | 'new';
interface Terms { deposit: number; rent: number }               // 원 단위 정수, rent 0 = 전세
interface JudgeInput { mode: Mode; current: Terms; proposed: Terms; lastChangeDate?: string; baseRate: number; rateOverride?: number }
interface JudgeResult {
  mode: Mode; verdict: 'within' | 'exceeds' | null;
  legalRate: number; baseRate: number; baseRateAsOf: string;
  currentEq: number; proposedEq: number; increase: number;        // increase 소수(0.05 = 5%)
  excessEq: number;                                                // 0 이상. 초과 환산보증금
  excessAsRent: number; excessAsDeposit: number;                   // 초과분을 월세/보증금으로 표현
  maxRentForProposedDeposit: number | null;                        // 제안 보증금 고정 시 허용 최대 월세. 음수면 0, 보증금만으로 초과면 null
  maxDepositForProposedRent: number | null;                        // 제안 월세 고정 시 허용 최대 보증금
  itemIncrease: { deposit: number | null; rent: number | null };   // 항목별 단순 인상률(참고 표시)
  withinOneYear: boolean | null;                                   // lastChangeDate 없으면 null
}
interface Scenario { id: string; name?: string; input: JudgeInput; createdAt: string; result: Pick<JudgeResult, 'verdict' | 'increase'> }
interface Unlock { until: number | null }
```

---

## 2. 화면 목록과 라우팅

| ID | 화면 | 진입 | 뒤로가기 |
|---|---|---|---|
| S01 | 홈 = 판정 (모드 세그먼트 + 입력 + 결과 카드) | 앱 시작, 딥링크 `/j` | 종료(`closeApp`) |
| S02 | 판정 상세 (산식 표) | S01 결과 카드 | S01 |
| S03 | 시간축 | S01 시간축 카드(해제 시) | S01 |
| S04 | 판정 카드 (이미지·공유) | S01 "판정 카드 만들기" | S01 |
| S05 | 전세↔월세 환산 | S01 하단 도구 탭 | S01 |
| S06 | 중개보수 상한 | S01 도구 탭, S01 결과 "이 계약의 중개보수" | 직전 |
| S07 | 임대차 신고 | S01 도구 탭, S01 결과 "신고 대상인가요" | 직전 |
| S08 | 저장 목록 | S01 | S01 |
| S09 | 설정 | S01 | S01 |
| S10 | 데이터 출처 | S09 | S09 |
| M01 | 오늘 하루 열기 (바텀시트) | 잠금 기능 탭 | 닫기 |
| M02 | 기준금리·전환율 (바텀시트) | S01·S05 "기준금리 3.00%" 칩 | 닫기 |
| M03 | 삭제 확인 (다이얼로그) | S08·S09 | 닫기 |

라우팅은 해시 없는 인메모리 스택(`@ait/kit` `pushBackHandler`/`runBackHandlers`). 백 이벤트는 `onBack`으로 가로채 스택 pop, 스택이 비면 `closeApp`. 자체 헤더·뒤로가기 버튼 없음.

---

## 3. 기능 명세

AC = 인수 조건(테스트로 고정).

### 3-1. 앱 시작·부트스트랩 (US-1, US-2)
1. `createStore('rc')` → `rc.profile` 없으면 `loadAnonProfile`로 생성.
2. 데이터 파일 3개 로드(번들 import). 실패 시 전체 오류 화면.
3. `rc.settings.baseRateOverride`가 있으면 기준금리 기본값으로, 없으면 `baserate.latest()`.
4. `rc.lastInput` 있으면 S01에 복원. 딥링크 파라미터가 있으면 딥링크 우선.
5. 리워드 광고 프리로드(3-9).
6. 기준금리 `asOf`가 오늘 − 90일 이전이면 S01 결과 카드 하단에 `data.stale` 한 줄.

AC
- [ ] 첫 실행에 `rc.profile.anonKey` 생성, 두 번째 실행에 재사용.
- [ ] 딥링크와 lastInput이 동시에 있으면 딥링크 값이 폼에 들어간다.

### 3-2. 법정 전환율·환산 (CE-1, CE-2, CE-3)

```ts
legalConversionRate(baseRate) = Math.min(CONVERSION_CEILING, baseRate + CONVERSION_SPREAD)
depositToRent(amount, rate)   = Math.round(amount * rate / 12)   // 공공 계산기(부동산원·렌트홈)와 같은 반올림, FACT_CHECK 5장
rentToDeposit(rent, rate)     = Math.round(rent * 12 / rate)
equivalentDeposit(t, rate)    = t.deposit + t.rent * 12 / rate      // 실수 유지, 표시 시 절사
```

- `rate`는 `rateOverride ?? legalConversionRate(baseRate)`. override가 있으면 결과에 `rateSource: 'user'`로 표시(S05 라벨 "참고 전환율").
- 판정(3-3)에서는 **항상 법정 전환율**을 쓴다. override는 S05 환산에서만 허용.

AC
- [ ] 기준금리 3.00% → 전환율 5.00%. 기준금리 8.5% → 10.00%(상한).
- [ ] 보증금 1억, 5% → 월세 416,667원(반올림).
- [ ] 월세 50만, 5% → 보증금 1억 2,000만 원.

### 3-3. 갱신 판정 (CE-4) — `judgeRenewal(input, data): JudgeResult`

전제: `mode === 'renew'`. 입력 검증: `current.deposit + current.rent > 0`, 모든 값 0 이상 정수. 위반 시 결과 없음(빈 상태).

1. `rate = legalConversionRate(baseRate)`.
2. `currentEq = equivalentDeposit(current, rate)`, `proposedEq = equivalentDeposit(proposed, rate)`.
3. `increase = proposedEq / currentEq − 1`.
4. `allowedEq = currentEq × (1 + INCREASE_CAP)`.
5. `excessEq = max(0, proposedEq − allowedEq)`. `verdict = excessEq > 0 ? 'exceeds' : 'within'`. 부동소수 오차 방지: `excessEq < 1(원)`이면 0으로.
6. `excessAsRent = round(excessEq × rate / 12)`, `excessAsDeposit = round(excessEq)`.
7. `maxRentForProposedDeposit`: `m = (allowedEq − proposed.deposit) × rate / 12`. `m < 0`이면 `null`(보증금만으로 초과), 아니면 `round(m)`.
8. `maxDepositForProposedRent`: `d = allowedEq − proposed.rent × 12 / rate`. `d < 0`이면 `null`, 아니면 `round(d)`.
9. `itemIncrease`: 항목별 `proposed.x / current.x − 1`(current.x가 0이면 null). 참고 표시용.
10. `withinOneYear`: `lastChangeDate` 있으면 `today − lastChangeDate < INCREASE_INTERVAL_DAYS`.

**근거(O-1 해결, 2026-09-08)**: 환산보증금 방식은 렌트홈 임대료 계산기(국토부) 산식과 같고, 국토부·법무부 해설집(2020-08) 전월세 전환 Q1 예시(전세 5억 → 보증금 3억 + 월세 ≤ 67만, 또는 2억 + ≤ 100만, 당시 전환율 4%)와 일치한다. 상세 화면(S02)에는 환산 인상률과 항목별 인상률을 둘 다 보여 준다.

AC (기준금리 3.00%, 전환율 5%)
- [ ] 현재 1억/0 → 제안 1억 500만/0: 인상률 5.00%, `within`, excess 0.
- [ ] 현재 1억/0 → 제안 1억 600만/0: `exceeds`, excessAsDeposit 1,000,000, excessAsRent 4,167.
- [ ] 현재 1억/0 → 제안 5,000만/월 20만: proposedEq = 5,000만 + 4,800만 = 9,800만 → `within`(인하). 헤드라인 `within`.
- [ ] 현재 1억/0 → 제안 5,000만/월 25만: proposedEq 1억 1,000만 → 인상률 10%, `exceeds`, maxRentForProposedDeposit = (1억 500만 − 5,000만) × 5% ÷ 12 = 229,167 (부동산원·렌트홈 동일값).
- [ ] 현재 5,000만/30만 → 제안 5,000만/31만 5천: currentEq 1억 2,200만, proposedEq 1억 2,560만 → 2.95%, `within`. itemIncrease.rent 5.00%.
- [ ] 제안 보증금이 allowedEq 초과 → maxRentForProposedDeposit `null`.
- [ ] lastChangeDate = 오늘 − 200일 → `withinOneYear: true`.
- [ ] **해설집 예시(전환율 4%로 고정)**: 현재 5억/0 → 제안 3억/월 666,666: proposedEq = 3억 + 666,666×12÷0.04 = 499,999,800 → `within`. 제안 3억/월 666,667 → 500,000,100 → 여전히 allowedEq(5.25억) 안 → `within`; 인상 0%가 아닌 5% 허용까지 반영되므로 해설집 "넘을 수 없음" 수치는 `maxRentForProposedDeposit`가 아니라 **인상 0% 기준 전환 상한** `depositToRent(2억, 4%) = 666,666`으로 대조한다. 제안 2억 → `depositToRent(3억, 4%) = 1,000,000`.

### 3-4. 신규 계약 모드 (CE-5)
- `mode === 'new'`: `judgeRenewal`을 호출하지 않는다. 결과 카드는 `verdict: null` 상태로 헤드라인 `new.headline`, 본문에 `depositToRent(proposed.deposit)`·`rentToDeposit(proposed.rent)` 환산 참고치 2줄, 링크 "중개보수 상한 보기"·"신고 대상인가요".
- 현재 조건 입력 묶음은 숨긴다(신규 계약엔 "지금 조건"이 없다).
- 딥링크 `m=new`면 이 모드로 진입.

AC
- [ ] 신규 모드에서 `judge_done` 이벤트의 verdict는 `none`.
- [ ] 신규 모드 화면 어디에도 "상한 초과"·"인상률" 문자열이 없다(DOM 텍스트 테스트).

### 3-5. 중개보수 상한 (CE-6) — `brokerageCap(input, data): BrokerageResult`

입력: `{ kind: 'lease' /* v1.0 UI */ | 'sale' /* [P1] */, deposit, rent, officetel: 'no' | 'qualified' | 'other' }`.

1. 거래금액 `tx = deposit + rent × RENT_MULTIPLIER`. `tx < RENT_MULTIPLIER_THRESHOLD`이면 `tx = deposit + rent × RENT_MULTIPLIER_UNDER_50M`, `usedMultiplier = 70`.
2. `officetel === 'no'`: 별표 1에서 `kind`·`tx` 구간 → `ratio`, `cap`. `fee = floor(tx × ratio)`, `cap`이 있으면 `fee = min(fee, cap)`.
3. `officetel === 'qualified'`: `ratio = officetel[kind]`, cap 없음. `'other'`: `ratio = OFFICETEL_OTHER_RATIO`, `negotiable: true`.
4. 결과 `{ tx, usedMultiplier, ratio, cap, fee, negotiable, vatNote: true }`. 부가세는 계산하지 않고 "별도" 문구만(일반·간이과세 여부를 앱이 알 수 없다).

AC
- [ ] 보증금 1,000만/월 30만: tx = 4,000만(<5천만) → 재계산 1,000만 + 2,100만 = 3,100만, 0.5%, 155,000원(한도 20만 이내).
- [ ] 보증금 3,000만/월 50만: tx = 8,000만, 0.4% = 320,000 → 한도 30만 → 300,000원.
- [ ] 보증금 2억/0: 0.3% = 600,000원, 한도 없음.
- [ ] 오피스텔 qualified 보증금 1억/월 50만: tx 1억 5,000만, 0.4% = 600,000원.
- [ ] 별표 구간 경계: tx = 정확히 5천만 → 0.4% 구간(이상).

### 3-6. 임대차 신고 (CE-7) — `reportRequired(deposit, rent, contractDate?)`

- `required = deposit > REPORT_DEPOSIT || rent > REPORT_RENT`. 이유 배열(`['deposit']`, `['rent']`, 둘).
- `deadline = contractDate ? contractDate + REPORT_DAYS일 : null`. 기한 지났으면 `overdue: true`(문구는 사실 안내만: "신고 기한이 지났어요. 지연 신고도 가능해요").
- 지역 판정 없음. 결과에 `regionNote: true` → 각주.

AC
- [ ] 6,000만/0 → 대상 아님. 6,000만 1원/0 → 대상.
- [ ] 0/30만 → 대상 아님. 0/30만 1원 → 대상.
- [ ] 계약일 2026-09-01 → 기한 2026-10-01.

### 3-7. 시간축 (CE-8) — `timeline(deposit, data): YearRow[]`
- 점 = `TIMELINE_YEARS` 각 연도 1월 1일 + `latest`. 각 점 `{ label, date, baseRate, legalRate, maxRent = depositToRent(deposit, legalRate) }`.
- `deposit`은 제안 보증금(신규 모드면 입력 보증금, 없으면 현재 보증금). 0이면 카드 숨김.
- 헤드라인: 첫 점과 마지막 점 비교 `timeline.headline` (증가/감소 서술형, 부호만).
- 같은 연도에 최신값이 1월 1일과 같은 날이면 중복 제거.

AC
- [ ] 2021-01-01 기준금리 0.50% → 전환율 2.50%. 보증금 1억 → 208,333원.
- [ ] 최신 3.00% → 5.00% → 416,666원. 헤드라인 delta 208,333.

### 3-8. 게이트·해제 (MZ-1)
net-pay 3-8과 동일. 게이트 기능: `timeline`, `saveExtra`(저장 4개째 이상). 상태 `rc.unlock.until`. M01 문구는 SCREEN_FLOW 5장.

AC: net-pay와 동일 + "판정 카드(S04)·중개보수(S06)·신고(S07)는 게이트 판정을 거치지 않는다".

### 3-9. 리워드·배너 광고 (MZ-2, MZ-3) — `@ait/kit` ads
net-pay 3-9와 동일(`configureAds`, `preloadRewarded`, `showRewarded`, `attachBanner`). 배너 위치: S01·S05·S06·S07·S08 최하단. S02·S03·S04·바텀시트 없음.

### 3-10. 판정 카드 (S04, UI-4) — 무료
1. 캔버스 1080×1350. 헤드라인: `within`이면 "제안 조건, 법정 상한 안이에요", `exceeds`면 "제안 조건, 법정 상한을 월 {excess}원 넘어요". 본문: "보증금 {pd}만 원 · 월세 {pr}만 원 → 인상률 {inc}% (상한 5%)", "기준금리 {br}% · 전환율 {rate}%". 하단 고정: "월세 이거 맞아? · 토스에서 열기" + 딥링크 텍스트.
2. 토글 "보증금 숨기기": on이면 보증금 숫자를 "●●●●"로. `rc.settings.cardHideDeposit`에 기억.
3. "이미지 저장" → `saveCardImage(base64, 'rentcheck-card.png')`(`canSaveImage()` false면 숨김). "링크 공유" → `shareLink('rent-calc', '/j?…', 텍스트)`.
4. 신규 모드에서는 카드 헤드라인 "신규 계약 환산 참고치"로, 판정 배지 없음.
5. 카드 문구는 3-13 린트 대상. 면책 한 줄 "참고용 판정 · 주택임대차보호법 기준" 포함.

AC
- [ ] 숨김 on 이미지·공유 텍스트에 보증금 숫자 없음.
- [ ] 딥링크로 열면 S01 모드·입력이 카드와 동일.

### 3-11. 전세↔월세 환산 (S05, UI-5)
- 방향 토글: 보증금 → 월세 / 월세 → 보증금. 입력 하나, 결과 하나.
- 전환율 칩: 기본 "법정 전환율 5.00%"(M02에서 기준금리 수정 시 재계산). 사용자가 전환율을 직접 입력하면 라벨 "참고 전환율 {r}%" + 각주 "법정 상한(갱신·기간 중 전환 시)은 {legal}%예요".
- 결과 아래 "이 조건으로 판정하기" → S01에 제안 조건으로 채움(모드는 유지).

### 3-12. 저장 (S08, UI-8)
- S01 결과 카드 "이 계산 저장" → `Scenario` 추가. 3개 초과는 게이트(M01). 해제 시 20개.
- 목록 항목: 모드 배지, "보증금 {d} · 월세 {r}", verdict 배지, 날짜. 탭 → S01 복원. 스와이프 없음, 항목 메뉴 "삭제" → M03.
- 비교 화면 없음(확정).

### 3-13. 설정·출처 (S09, S10)
- 기준금리: 현재 적용값 표시, "직접 입력"(0.00~20.00%, 0.25 단위 아님 — 자유 입력), "번들값으로 초기화". override는 `rc.settings.baseRateOverride`. 결과 화면 기준일 줄에 "(직접 입력)" 표시.
- 데이터 출처 S10: 세 데이터 파일의 `meta`를 그대로 렌더 + 다음 갱신 안내("기준금리는 한국은행 금통위 결정 후 갱신").
- 저장 데이터 전체 삭제(M03 2단계), 고객문의(`VITE_SUPPORT_EMAIL`), 같은 개발자의 다른 미니앱(net-pay `intoss://net-pay`, fx-replay).

### 3-14. 저장소 스키마 (US-2) — `createStore('rc')`

| 키 | 타입 | 상한 | 비고 |
|---|---|---|---|
| `rc.profile` | { anonKey, schema, createdAt } | 1KB | |
| `rc.lastInput` | JudgeInput | 1KB | 즉시 저장 |
| `rc.scenarios` | Scenario[] | 32KB | 무료 3 / 해제 20 |
| `rc.unlock` | Unlock | 1KB | |
| `rc.settings` | { baseRateOverride?, cardHideDeposit } | 1KB | |
| `rc.ads` | { lastRewardAt } | 1KB | |

localStorage·IndexedDB 금지(ESLint). 마이그레이션은 `profile.schema` 기준.

### 3-15. 문구 규칙·린트 (원칙 A, B) — `runCopyLint` + `scripts/copy-rules.ts`

대상: `src/i18n/ko.json`, 카드 문구 템플릿.

금지어(정규식, 그룹):
- **A(금융 상품)**: `대출|보증보험|HUG|HF|SGI|카드 ?납|적금|예금|투자|한도`
- **B(단정·권고)**: `위반|불법|소송|고소|거절하|받아들이|추천|유리해|불리해|손해|이득|최적|정확한 ?판정|확실`
- **C(중개·시세)**: `시세|매물|추천 ?매물|급매`
- **허용 예외**: "법정 상한", "임대차분쟁조정위원회", "신고 기한".

빌드: `npm run lint:copy` — 위반 시 exit 1.

### 3-16. 이벤트 로그
사용자 식별은 anonKey 해시. **금액은 어떤 형태로도 로그에 넣지 않는다.**

| 이벤트 | 속성 |
|---|---|
| `app_open` | hasLastInput, unlocked, fromDeeplink |
| `judge_done` | mode(renew/new), verdict(within/exceeds/none), hasLastChangeDate(bool) |
| `calc_done` | kind(convert/broker/report) |
| `broker_done` | officetel(no/qualified/other) |
| `report_done` | required(bool) |
| `detail_view` | — |
| `gate_view` | feature(timeline/saveExtra) |
| `ad_rewarded_load` / `ad_rewarded_show` / `ad_reward_earned` | ok / — / — |
| `timeline_view` | points(count) |
| `share_card_created` | hideDeposit(bool), via(image/link), verdict |
| `scenario_saved` | countAfter |
| `baserate_override` | set(bool) |
| `banner_impression` | screen |

---

## 4. 빌드·데이터 파이프라인 (DT-1 ~ DT-5)

| 스크립트 | 동작 |
|---|---|
| `data:fetch` | (a) ECOS 722Y001 일별(1999~오늘) → 변동 시점 추출 → `baserate.json`. fx-replay `scripts/ecos.ts` 재사용, 컷오프 없음. (b) law.go.kr 별표 1·2 평문 → `data-src/brokerage/{amendedOn}.txt` 보존. |
| `data:build` | 별표 평문 → `brokerage.json`. 파서 단정(1-2). `legal.json`은 수동. |
| `check:data` | (a) `baserate.meta.asOf` ≥ 오늘 − 180일(아니면 실패, 90일 초과는 경고), (b) 별표 구간 연속성·요율 범위, (c) `legal.json` 값과 0장 상수 일치, (d) 골든 테스트. |
| `check:config` / `check:config:release` | net-pay와 동일 2단계 빌드 가드(테스트 광고 ID / 실 ID, `VITE_SUPPORT_EMAIL`). |
| `build` / `build:release` | `check` → `check:data` → `check:config` → `vite build` → `ait build`. |

---

## 5. 비기능 요구사항
- 번들 ≤ 1.5MB(gzip 전). 데이터 파일 합계 ≤ 50KB.
- 계산은 동기, 입력 후 300ms 디바운스 안에 결과.
- 오프라인에서 광고 외 전 기능 동작.
- 접근성: 잠금 카드는 실제 수치를 DOM에 넣지 않는다(자리표시자). 금액은 `aria-label`에 원 단위 전체 표기.
- 라이트 모드 고정, 세이프 에어리어 SDK 값, 자체 헤더 없음.

---

## 6. 테스트 매트릭스

| 영역 | 종류 | 케이스 |
|---|---|---|
| 엔진 3-2~3-7 | 단위 | 위 AC 전부 + 경계(0원, 상한 정확히 5%, 전환율 상한 10%) |
| 골든 | 대조 | FACT_CHECK.md 3장 37건 — 부동산원·렌트홈 전환 10건 + 최대 보증금 2건 + 인상률 9건, 마이홈 중개보수 10건, 신고 리터럴 6건 |
| 데이터 | 검증 | 별표 파서 단정, legal.json ↔ 상수 일치, baserate 변동 시점 단조 |
| 모드 | DOM | 신규 모드에 판정 문구 없음 |
| 게이트 | 시간 모킹 | 23:59 해제 → 00:00 잠금 |
| 카드 | 문자열 | 숨김 on에 보증금 숫자 없음 |
| 딥링크 | 파서 | 정상·누락·음수·문자 |
| 문구 | 린트 | 금지어 3그룹 |

---

## 7. 오픈 이슈
PRD 11장 O-1~O-5와 동일. 추가:

| ID | 내용 | 해결 시점 |
|---|---|---|
| O-6 | 환산보증금 소수 처리 — 인상률 표시를 둘째 자리 반올림할 때 정확히 5.00%로 보이지만 내부적으로 초과인 경우(예 5.004%) 헤드라인은 `exceeds`. 표시를 "5.00%(상한 초과)"로 둘지, 셋째 자리를 보일지. | W1 |
| O-7 | 기준금리 자유 입력 범위(0~20%)와 "0.25% 단위 아님" 허용이 맞는지. | W1 |

## 8. 변경 이력
- 2026-09-08 v0.1 초안. PRD v0.1 기준. 환산보증금 판정 방식(O-1 전제), 신규 모드 분리, 오피스텔 3상태 토글, 비교 화면 제외.
- 2026-09-08 v0.2 O-1 해결 근거 기록, 해설집 예시 골든 케이스 추가, B5 문구 키 분리(`judge.consentRenewal` / `judge.consentNew`).
- 2026-09-08 v0.3 FACT_CHECK 37건 반영. CE-2·CE-4 절사 → 반올림(공공 계산기와 일치). AC 수치 갱신.
