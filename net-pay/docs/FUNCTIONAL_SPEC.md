# 기능 명세 — net-pay (가칭 "세후로 말해줘")

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.4 (2026-09-07) |
| 상위 문서 | [PRD.md](PRD.md) v0.3 — 요구사항 ID(CE-, DT-, UI-, MZ-, US-)는 PRD와 동일 |
| 공용 코드 | [../../docs/SHARED_PACKAGE.md](../../docs/SHARED_PACKAGE.md) `@ait/kit` |
| 적용 범위 | **v1.0 (광고 전용, 서버 없음)**. P1·P2 항목은 `[P1]` `[P2]` 표시 |
| 관련 문서 | 화면 흐름·와이어프레임 ([SCREEN_FLOW.md](SCREEN_FLOW.md)), 계산 검증 기록 ([FACT_CHECK.md](FACT_CHECK.md)) |

이 문서는 "무엇을 어떻게 동작시키는가"를 구현 가능한 수준으로 적는다. 화면 배치·비주얼은 다음 문서에서 다룬다.

---

## 0. 상수·용어

| 상수 | 값 | 설명 |
|---|---|---|
| `NONTAX_MEAL_DEFAULT` | 200,000 | 기본 비과세 식대(월). 토글 off면 0 |
| `DEPENDENTS_MIN/MAX` | 1 / 11 | 공제대상가족 수(본인 포함). 세액표 열은 11개 |
| `CHILDREN_MAX` | 10 | 8세 이상 20세 이하 자녀 수 입력 상한 |
| `TIMELINE_YEARS` | 2021 … 현재 연도 | 시간축 범위(확정: 5년 + 현재) |
| `REVERSE_TOL` | 1,000 | 역산 종료 허용 오차(월 실수령, 원) |
| `REVERSE_MAX_ITER` | 40 | 역산 이진 탐색 최대 반복 |
| `GROSS_MAX` | 5,000,000,000 | 역산 탐색 상한(연봉 50억) |
| `SAVED_FREE` | 3 | 무료 저장 시나리오 수 |
| `SAVED_CAP` | 20 | 게이트 해제 시 저장 상한 |
| `ORDINARY_HOURS_DEFAULT` | 209 | 월 소정근로시간(주 40시간) |
| `SCHEMA_VERSION` | 1 | Storage 스키마 버전 |

용어: **세전 월급(grossMonthly)** = 연봉 ÷ 12. **과세 월급(taxableMonthly)** = 세전 월급 − 비과세. **공제(Deductions)** = 4대보험 근로자 부담분 + 소득세 + 지방소득세. **실수령(netMonthly)** = 세전 월급 − 공제. **역산(reverse)** = 목표 실수령 → 연봉. **시간축(timeline)** = 같은 연봉의 연도별 실수령. **게이트(gate)** = 리워드 광고로 하루 열리는 기능 묶음. **시나리오(Scenario)** = 저장된 입력값 세트.

사용자 화면 용어(원칙 B3): "필요한 연봉", "월 실수령", "공제 합계", "참고용 계산". 금지: "적정 연봉", "불러야", "추천".

---

## 1. 데이터 모델

### 1-1. 간이세액표 (`src/data/tax-tables.json` — 시행판 전체를 한 파일에 담는다)

```ts
interface TaxTableFile {
  meta: {
    source: "국세청 근로소득 간이세액표(소득세법 시행령 별표 2)";
    effectiveFrom: string;     // "2026-03-01"
    fetchedAt: string;         // 다운로드일
    url: string;               // 홈택스 다운로드 페이지
    license: "공공데이터포털 이용허락범위 제한 없음";
  };
  /** 월 과세급여 구간. lo 이상 hi 미만, 원 단위. 첫 구간 lo = 1,060,000. 마지막 구간 hi = 10,000,000 */
  brackets: { lo: number; hi: number; tax: number[] /* length 11, 공제대상가족 1~11명 */ }[];
  /** 8세 이상 20세 이하 자녀 차감 (2026-03-01 시행판: 20,830 / 45,830 / 45,830 + 33,330×(n−2)) */
  childDeduction: { one: number; two: number; extraPerChild: number };
  /** 개발용 합성 표. true면 프로덕션 빌드가 차단된다 */
  meta.dev?: true;
  /**
   * 표 상한(1,000만 원) 초과 산식. 세액표 원본 비고에서 확정한다(오픈 이슈 O-1).
   * 세액 = (마지막 구간 세액) + add + (과세급여 − from) × factor × rate, 구간 누적.
   * verified=false면 프로덕션 빌드가 차단된다.
   */
  overCap: { verified: boolean; segments: { from, to, add, factor, rate }[] };
}
```

> 시행판을 파일로 쪼개면 정적 번들에 넣을 때 파일 목록을 따로 관리해야 한다.
> 시행판 4개를 합쳐도 300KB 안쪽이라 **한 파일에 배열로** 담고 `import` 한 번으로 끝낸다.

- 무결성 규칙(빌드 테스트): `brackets[i].hi === brackets[i+1].lo`, 각 행 `tax.length === 11`, 같은 열에서 세액 단조 비감소, 같은 행에서 가족 수가 늘수록 세액 단조 비증가, `lo` 미만(1,060,000원 미만)은 세액 0.
- 과거 시행판(2021-02, 2023-02, 2024-02)은 같은 스키마로 `tax-table/` 아래 병렬 보관. 확보 못 한 연도는 파일 없음(1-3 참조).

### 1-2. 4대보험 요율 (`src/data/rates.json`)

```ts
interface RateRow {
  from: string;                        // 시행일 "2026-07-01"
  nps:  { totalRate; employeeShare; baseMin; baseMax };
  nhis: { totalRate; employeeShare; ltcRateOnPremium; premiumMin; premiumMax };  // 보험료는 총액 기준
  ei:   { totalRate; employeeShare };  // 실업급여 근로자 부담은 절반이 아니라 전액
  sources: { label; url; checkedAt }[];
  needsVerification?: string[];        // 원문 대조 전인 항목
}
type RatesFile = RateRow[];            // from 오름차순
```

> 고시는 **총요율과 총 보험료 상·하한**으로 정해지고 근로자는 그 절반을 낸다(고용보험은 예외).
> 그래서 근로자 부담값을 그대로 저장하지 않고 `totalRate × employeeShare`로 계산한다.
> "상한이 총액인지 본인 부담인지" 같은 해석 오류가 데이터에 굳는 것을 막는다.

- 조회 규칙 `rateFor(date)`: `from <= date`인 마지막 행. 2026년은 1월·7월 두 행(국민연금 상하한 변경).
- 2026-07-01 행(확인됨): `nps.employeeRate 0.0475, baseMin 410,000, baseMax 6,590,000` / `nhis.employeeRate 0.03595, ltcRateOnPremium 0.1314, employeePremiumMax 4,591,740` / `ei.employeeRate 0.009`.
- `nhis.employeePremiumMin`: 고시 하한 20,160원이 총액인지 본인 부담인지 확인 후 기입(O-2).
- 절사(`rounding`) 기본값은 공단 규정 추정치이며 골든 테스트(6장)로 확정한다. 확정 전에는 테스트가 실패해야 한다(추정치 그대로 출시 금지).

### 1-3. 시간축 연도 해석
- 연도 Y의 요율 = `rateFor("Y-12-31")` (그 해 하반기 시행값). 화면 라벨 "Y년 하반기 기준".
- 연도 Y의 세액표 = `effectiveFrom <= "Y-12-31"`인 최신 파일. 없으면(Y가 가장 오래된 파일보다 앞) **최신 파일**을 쓰고 `taxTableFallback: true`.

### 1-4. 런타임 상태

```ts
interface CalcInput {
  mode: "reverse" | "forward";
  annualGross?: number;        // forward 입력 (원)
  targetNet?: number;          // reverse 입력: 월 실수령 목표 (원)
  dependents: number;          // 1~11, 본인 포함
  children: number;            // 8세 이상 20세 이하, 0~10
  nonTaxableMonthly: number;   // 기본 200,000
  taxRatio: 0.8 | 1 | 1.2;     // v1.0 UI 미노출, 항상 1 [P1]
  asOf: string;                // "YYYY-MM-DD", 기본 오늘
}
interface Breakdown {
  asOf: string; taxTableEffectiveFrom: string; taxTableFallback: boolean;
  annualGross: number; grossMonthly: number; taxableMonthly: number;
  nps: number; nhis: number; ltc: number; ei: number; incomeTax: number; localTax: number;
  deductions: number; netMonthly: number; netAnnual: number;
}
interface ReverseResult {
  target: number;
  annualGross: number;         // 목표를 만족하는 최소 연봉(원)
  annualGrossDisplay: number;  // 만 원 단위 올림
  achievedNet: number;         // 그 연봉의 실수령(≥ target)
  breakdown: Breakdown;
}
interface Scenario { id: string; name: string; input: CalcInput; createdAt: string; }
interface Unlock { until: number | null; }   // epoch ms, 기기 로컬 다음 자정
```

---

## 2. 화면 목록과 라우팅

라우터는 경로 기반(딥링크 `intoss://net-pay/<path>` 매핑). 앱인토스 네비게이션 바 사용, 첫 화면(S01)에서 뒤로가기 → 미니앱 종료.

| ID | 경로 | 화면 | 게이트 |
|---|---|---|---|
| S01 | `/` | 홈 = 역산 입력 + 결과 카드 | — |
| S02 | `/gross` | 정방향(연봉 입력) + 결과 카드 | — |
| S03 | `/detail` | 공제 상세(항목·요율·근거·연간 합계·면책) | — |
| S04 | `/timeline` | 시간축 카드(연도별 실수령 막대 차트) | ● |
| S05 | `/card` | 협상 카드 미리보기·금액 숨김 토글·저장·공유 | — |
| S06 | `/severance` | 퇴직금 계산 | — |
| S07 | `/leave` | 연차수당 계산 | — |
| S08 | `/saved` | 저장한 시나리오 목록 | 3개 초과 저장 ● |
| S09 | `/compare?a=&b=` | 두 시나리오 병렬 비교 | ● |
| S10 | `/settings` | 설정(출처·기준일·다음 갱신·삭제·문의·다른 미니앱) | — |
| S11 | `/settings/sources` | 데이터 출처 상세 | — |
| M01 | 바텀시트 | 게이트: "광고 보고 오늘 하루 열기" | |
| M02 | 바텀시트 | 계산 옵션(가족 수·자녀 수·비과세·기준일) | |
| M03 | 다이얼로그 | 삭제 확인(시나리오 1개 / 전체) | |

딥링크: `/r?net=<원>&dep=<1-11>&kids=<0-10>&nt=<원>` → S01에 값 채움. `/g?gross=<원>&dep&kids&nt` → S02. 범위 밖·비숫자 값은 해당 파라미터만 무시. 알 수 없는 경로는 `/`.

---

## 3. 기능 명세

각 항목: **동작 → 상태·데이터 → 예외 → 수용 기준(AC)**.

### 3-1. 앱 시작·부트스트랩 (US-1, US-2)

동작
1. S01을 즉시 렌더(빈 입력 + 옵션 기본값). 백그라운드에서: (a) `np.profile` 로드, 없으면 `User.getAnonymousKey()`로 생성·저장, (b) 스키마 버전 확인, (c) `np.unlock`·`np.settings`·`np.lastInput` 로드 → 마지막 입력값 복원, (d) `configureAds` 후 리워드 프리로드(3-9), (e) 딥링크 파라미터가 있으면 입력값 덮어쓰기.
2. 데이터 기준일 검사: 번들 `rates.json` 최신 행의 연도 < 현재 연도이면 S01 상단에 얇은 안내 "2027년 요율은 아직 반영 전이에요. 2026년 기준으로 계산합니다"(원칙 B2).

예외
- `getAnonymousKey` 실패: 로컬 uuid 임시 프로필, 다음 시작 때 재시도. 앱은 정상 시작.
- Storage 읽기 실패: 빈 상태로 시작, 토스트 "저장된 기록을 불러오지 못했어요".

AC
- [ ] 콜드 스타트에서 S01 첫 렌더 1초 이내, 인터랙션 지연 2초 미만.
- [ ] 재진입 시 마지막 입력값·저장 시나리오·해제 상태 유지.
- [ ] 진입 직후 바텀시트 자동 오픈 없음.

### 3-2. 정방향 계산 엔진 (CE-1 ~ CE-5) — 순수 함수 `computeNet(input, data): Breakdown`

동작 (순서 고정, 모두 정수 원 단위)
1. `grossMonthly = floor(annualGross / 12)`.
2. `taxableMonthly = max(0, grossMonthly − nonTaxableMonthly)`.
3. 국민연금: `base = clamp(truncTo(taxableMonthly, 1000), baseMin, baseMax)`; `nps = floor(base × employeeRate)`.
4. 건강보험: `nhis = floor10(taxableMonthly × employeeRate)`; `nhis = clamp(nhis, employeePremiumMin, employeePremiumMax)`.
5. 장기요양: `ltc = floor10(nhis × ltcRateOnPremium)`.
6. 고용보험: `ei = floor10(taxableMonthly × employeeRate)`.
7. 소득세(3-3): `incomeTax = lookupIncomeTax(taxableMonthly, dependents, children, table) × taxRatio`, 결과 `floor10`.
8. 지방소득세: `localTax = floor10(incomeTax × 0.1)`.
9. `deductions = nps + nhis + ltc + ei + incomeTax + localTax`; `netMonthly = grossMonthly − deductions`; `netAnnual = netMonthly × 12`.

상태·데이터: `rateFor(asOf)`, `taxTableFor(asOf)`(1-3). 계산은 렌더 스레드에서 동기 실행(1ms 미만).

예외
- `annualGross < 0` 또는 비정수: 입력 검증에서 차단. `annualGross = 0` → 모든 값 0.
- `taxableMonthly < 1,060,000`: 소득세 0(세액표 하한 미만).

AC
- [ ] 골든 케이스 20개(6장)가 홈택스·공단 계산기 결과와 원 단위 일치(절사 규칙 확정 후).
- [ ] 연봉 0 ~ 50억 구간에서 `netMonthly`가 `annualGross`에 대해 단조 비감소(1만 원 단위 전수 테스트).
- [ ] 국민연금 상·하한, 건강보험 상한이 각각 걸리는 케이스 3개 테스트.

### 3-3. 소득세 조회 `lookupIncomeTax(taxable, dependents, children, table)`

동작
1. `taxable < brackets[0].lo` → 0.
2. `taxable < 10,000,000`: `lo <= taxable < hi` 행을 이진 탐색, `tax[dependents − 1]` (dependents는 1~11로 클램프).
3. `taxable >= 10,000,000`: `overCap` 구간 산식. **산식 계수는 세액표 원본 각주에서 확정한다(O-1). 확정 전 빌드는 `check:data`가 차단.**
4. 자녀 차감: `children === 1 → one`, `=== 2 → two`, `>= 3 → two + extraPerChild × (children − 2)`. `max(0, tax − deduction)`.
5. `dependents`에 자녀가 포함되어야 한다(공제대상가족 수 = 본인 + 배우자 + 자녀 등 실제 수). UI에서 `children > dependents − 1`이면 자동으로 `dependents = children + 1`로 올리고 안내(3-6).

AC
- [ ] 세액표 경계값(각 구간 lo, hi − 1)에서 올바른 행 선택 테스트.
- [ ] 자녀 0/1/2/3/5명 차감액 테스트, 차감 후 음수 없음.

### 3-4. 역산 엔진 (CE-6) — `computeGross(targetNet, opts, data): ReverseResult`

**측정 결과(2026-09-07): 정방향은 단조 증가가 아니다.** 연봉 1,200만~2억 구간을 12원(월 1원) 간격으로
훑으면 실수령이 내려가는 지점이 284,414곳 있고 최대 낙폭은 **월 2,417원**이다. 원인은 두 가지다.
간이세액표가 월 과세급여 10,000원 단위 계단이고, 국민연금 기준소득월액이 1,000원 단위로 절사된다.
따라서 단순 이진 탐색은 목표에 못 미치는 연봉을 답으로 낼 수 있다.

동작
1. `targetNet <= 0` → 연봉 0. `net(GROSS_MAX) < targetNet` → `outOfRange`.
2. **격자 이진 탐색**: 세액표 구간 폭에 대응하는 연봉 격자(120,000원) 위에서 탐색한다.
   격자 한 칸에서 세전은 월 10,000원 늘고 공제는 많아야 약 3,700원 느는 것이 보장되므로 격자 위에서는 단조다.
   불변식 `net(lo) < target <= net(hi)`, 둘 다 격자점.
3. **칸 안 선형 탐색**: `[lo, hi]`를 12원 간격으로 훑어 목표를 만족하는 가장 낮은 연봉을 고른다.
4. **뒤따르는 하락 보정**: 답 이후 `hi`까지 목표 아래로 떨어지는 지점이 있으면 그 뒤로 옮긴다.
   `hi`는 격자점이라 `net(hi) >= target`이 보장되므로 반드시 끝난다.
5. `annualGrossDisplay = ceil(annualGross / 10,000) × 10,000`.

예외 — **저소득 계단**: 과세 월급이 0원에서 막 생기는 순간 국민연금·건강보험 **하한**이 한꺼번에
걸려 실수령이 크게 한 번 떨어진다(비과세 20만 원 기준 연봉 240만 → 252만에서 월 200,000 → 179,035원).
제도상 계단이며 계산 오류가 아니다. 최저임금에 한참 못 미치는 구간에서만 나타나므로 격자 탐색의
전제는 실사용 구간에서 성립한다. 테스트로 동작을 고정해 둔다.

AC
- [ ] 목표 100만/200만/300만/500만/1,000만/3,000만 원에서 `achievedNet >= target` 그리고 `net(annualGross − 12) < target`.
- [ ] 40회 이내 수렴, 실행 1ms 미만(연산 40 × 정방향).

### 3-5. 시간축 (CE-7) — `computeTimeline(annualGross, opts, data): YearRow[]`

동작
1. `years = [2021 … 현재 연도]`. 각 연도 `asOf = "Y-12-31"`로 `computeNet` 호출.
2. `YearRow = { year, netMonthly, deductions, nps, nhis, ltc, ei, incomeTax, localTax, taxTableFallback, rates: { npsRateTotal, nhisRateTotal, ltcRate } }`.
3. 헤드라인 문장(서술형, 평가 없음): "같은 연봉이라면 2021년보다 매달 {Δ}원을 더 내게 됐어요" (Δ = 현재 연도 공제 − 2021 공제, Δ ≤ 0이면 "…덜 내게 됐어요"). 각주: fallback 연도가 하나라도 있으면 "소득세는 현행 세액표 기준으로 계산했어요".
4. 하단 표: 연도별 국민연금·건강보험·장기요양 총요율.

AC
- [ ] 2021~2026 6행, 각 행 요율이 `rates.json`의 해당 연도 하반기 행과 일치.
- [ ] fallback 플래그가 파일 부재 연도에만 true.

### 3-6. 홈 · 역산 입력 (S01, UI-1)

구성: 상단 입력 "세후로 월 [____]만 원 받고 싶어요" / 옵션 요약 칩(가족 1명 · 자녀 0 · 식대 포함 → 탭 시 M02) / 결과 카드 / "지금 연봉이 있다면 → 연봉으로 계산" 링크(S02) / 시간축 카드(잠금 미리보기) / 협상 카드 버튼 / 하단: 퇴직금·연차수당 진입, 배너.

동작
- 입력은 만 원 단위 정수, 최대 7자리(9,999,999만 원). 300ms 디바운스 후 `computeGross`. 결과 카드는 값이 있을 때만 렌더, 없으면 예시 문구.
- 옵션 변경(M02)은 즉시 재계산. `children > dependents − 1`이면 dependents 자동 보정 + 인라인 안내 "자녀도 공제대상 가족에 포함돼요. 가족 수를 {n}명으로 맞췄어요".
- 입력·옵션은 `np.lastInput`에 즉시 저장.
- 결과 카드 탭 → S03. "이 연봉, 5년 전이었다면" 카드 탭 → 해제 상태면 S04, 아니면 M01. "협상 카드 만들기" → S05.
- 첫 화면 하단 고정 한 줄: "입력한 금액은 이 기기 안에서만 계산돼요"(원칙 C4).

AC
- [ ] 첫 화면에 정방향 입력이 아닌 실수령 입력이 노출된다(스크린샷 1).
- [ ] 결과 카드에 "약" 표기와 만 원 단위 표시, 상세에 원 단위.
- [ ] 배너는 스크롤 콘텐츠 최하단에만, 키패드 위로 올라오지 않는다.

### 3-7. 정방향 · 상세 (S02, S03, UI-2, UI-3)

S02: 입력 "연봉 [____]만 원". 동일 옵션 칩. 결과 카드 "월 실수령 {netMonthly}원 · 연 {netAnnual}원". 나머지 S01과 동일.

S03 상세 표: 항목 | 월 금액 | 요율·근거 | 연간. 행: 세전 월급, 비과세, 과세 월급, 국민연금(4.75% · 기준소득월액 상한 적용 여부), 건강보험(3.595%), 장기요양(건보료의 13.14%), 고용보험(0.9%), 소득세(간이세액표 {effectiveFrom} · 가족 {n} · 자녀 {k}), 지방소득세(소득세의 10%), 공제 합계, 실수령. 하단 고정: 기준일 문구(B2) + 면책(B1) + "연말정산 결과는 반영되지 않습니다"(B4). 최하단 배너.

AC
- [ ] 상한이 적용된 항목에 "상한 적용" 배지.
- [ ] 면책·기준일 문구가 항상 렌더(스냅샷 테스트).

### 3-8. 게이트·해제 (MZ-1)

게이트 기능: `timeline`, `compare`, `saveExtra`(저장 4개째 이상). 해제는 하나의 상태 `np.unlock.until`.

동작
- 판정 `isUnlocked() = unlock.until !== null && Date.now() < unlock.until`.
- 잠금 상태에서 게이트 기능 진입 → M01: 제목 "오늘 하루 열기", 설명 "광고를 보면 오늘 자정까지 시간축 비교·시나리오 비교·저장 20개를 쓸 수 있어요", 버튼 "광고 보고 열기" / "다음에".
- 보상 수신 시 `until = 기기 로컬 다음 자정 00:00`. 저장 후 M01 닫고 원래 목적지로 이동, 토스트 "오늘 자정까지 열렸어요".
- 자정 경과 후 진입 시 다시 M01.

AC
- [ ] `dismissed`만 발생 → `until` 불변.
- [ ] 23:59 해제 → 00:00 잠금(시간 모킹 테스트).
- [ ] 협상 카드(S05)는 게이트 판정을 거치지 않는다.

### 3-9. 리워드·배너 광고 (MZ-2, MZ-3) — `@ait/kit` ads

설정: `configureAds({ rewarded: VITE_AD_REWARDED_ID ?? 'ait-ad-test-rewarded-id', banner: VITE_AD_BANNER_ID ?? 테스트 ID })`. 프로덕션 빌드에 테스트 ID 잔존 시 `check-ad-ids` 실패.

리워드 상태 머신: `idle → loading → loaded → showing → (rewarded|closed|failed) → idle`.
- 프리로드: S01 마운트 시. 실패 시 5초 후 1회 재시도.
- 표시: M01 "광고 보고 열기" 탭 → `loaded`일 때만 `showRewarded`. 아니면 토스트 "지금은 광고를 불러올 수 없어요. 잠시 후 다시 시도해 주세요".
- 보상: `onReward`(= `userEarnedReward`)에서만 3-8 해제. 보상 후 즉시 다음 프리로드.
- 앱 사운드 없음.

배너: S01·S02·S03·S08 최하단(스크롤 컨테이너 안). S04·S05·S06·S07·바텀시트에는 없음. `isSupported()` false면 미렌더.

AC: fx-replay 3-8과 동일 + "해제 후 홈 복귀 시 시간축 카드가 잠금 해제 상태로 보인다".

### 3-10. 협상 카드 (S05, UI-5) — 무료

동작
1. 캔버스 1080×1350(4:5). 내용: 헤드라인 "세후 월 {net}만 원", 본문 "= 연봉 약 {gross}만 원 · {Y}년 기준 · 월 공제 약 {ded}만 원", 하단 고정 "세후로 말해줘 · 토스에서 열기" + 딥링크 텍스트(`intoss://net-pay/r?net=…&dep=…&kids=…`).
2. 토글 "연봉 숨기기": on이면 본문에서 연봉·공제 줄 제거, 실수령만 노출. 토글 상태는 `np.settings.cardHideGross`에 기억.
3. "이미지 저장" → `saveCardImage(base64, 'netpay-card.png')`(`canSaveImage()` false면 버튼 숨김). "링크 공유" → `shareLink('net-pay', '/r?…', '세후 월 {net}만 원 = 연봉 약 {gross}만 원 (참고용 계산)')` — 숨김 토글 on이면 텍스트에서 연봉 제거.
4. 카드 문구는 3-13 린트 대상.

AC
- [ ] 카드 이미지에 면책 한 줄("참고용 계산 · 간이세액표 기준") 포함.
- [ ] 숨김 on 상태의 이미지·공유 텍스트에 연봉 숫자 없음(문자열 테스트).
- [ ] 딥링크로 열면 S01 입력·옵션이 카드와 동일.

### 3-11. 퇴직금 (S06, CE-8) — `computeSeverance(input): SeveranceResult`

입력: `joinDate`, `lastWorkDate`(마지막 근무일), `wages3m`(퇴직 전 3개월 임금 총액, 기본값 = 세전 월급 × 3 자동 채움, 수정 가능), `annualBonus`(선택), `annualLeavePay`(선택), `ordinaryDaily`(선택, 1일 통상임금).

동작
1. `leaveDate = lastWorkDate + 1일`. `days = leaveDate − joinDate` (일수). `days < 365` → 결과 0 + 안내 "1년 미만 근무는 퇴직금 지급 대상이 아닐 수 있어요".
2. `period3m` = `leaveDate` 직전 3개월의 실제 일수(예: 3-15 퇴직 → 12-15~3-14 = 90 또는 91).
3. `avgDaily = floor((wages3m + annualBonus × 3/12 + annualLeavePay × 3/12) / period3m)`.
4. `ordinaryDaily`가 있고 `avgDaily < ordinaryDaily`면 `avgDaily = ordinaryDaily`(근로기준법 제2조 제2항 안내 문구).
5. `severance = floor(avgDaily × 30 × days / 365)`.
6. 결과: 세전 퇴직금, 재직 {y}년 {m}개월 {d}일, 1일 평균임금, 산식 표시. 퇴직소득세는 `[P1]`(CE-10) — v1.0은 "퇴직소득세는 별도" 문구.

AC
- [ ] 고용노동부 퇴직금 계산기 예시 5건과 원 단위 일치(FACT_CHECK.md).
- [ ] 윤년 포함 기간, 1년 미만, 정확히 365일 경계 테스트.

### 3-12. 연차수당 (S07, CE-9) — `computeLeavePay(input)`

입력: `monthlyOrdinary`(월 통상임금, 기본값 = 세전 월급), `monthlyHours`(기본 209), `unusedDays`(0.5 단위 허용).

동작: `hourly = floor(monthlyOrdinary / monthlyHours)`; `daily = hourly × 8`; `pay = floor(daily × unusedDays)`. 결과에 시급·일급·산식 표시. 안내: "통상임금에 포함되는 수당은 회사 규정에 따라 달라요"(B1 계열).

AC
- [ ] 209시간·월 300만 원·미사용 5일 → 시급 14,354 · 일급 114,832 · 수당 574,160(floor 규칙 확인).

### 3-13. 저장·비교 (S08, S09, UI-7, US-4)

동작
- "이 계산 저장" (S01/S02 결과 카드): 이름 입력(기본 "계산 {n}", `[P1]` 자유 이름) → `np.scenarios`에 추가. 무료 3개, 4개째부터 게이트(3-8), 해제 시 상한 20.
- S08 목록: 이름·모드·핵심 수치·저장일. 탭 → 해당 모드 화면에 입력 복원. 스와이프/길게 눌러 삭제(M03).
- "비교하기": 2개 선택 → S09(게이트). 병렬 표: 연봉, 세전 월급, 각 공제, 실수령, 차이 열. 평가 문구 없음.

AC
- [ ] 무료 상태에서 4번째 저장 시도 → M01, 저장되지 않음.
- [ ] 해제 상태에서 21번째 저장 → "최대 20개까지 저장할 수 있어요", 저장되지 않음.

### 3-14. 설정·출처 (S10, S11, UI-8, US-3)

S10: 데이터 기준(세액표 시행일·요율 연도·다음 갱신 예정 "매년 1월·3월·7월") / 데이터 출처(S11) / 저장 데이터 전체 삭제(M03 2단계) / 고객문의(메일) / 같은 개발자의 다른 미니앱(fx-replay, `intoss://` 스킴만) / 버전.

S11: 각 데이터의 정식 명칭, 출처 URL, 확인일, 라이선스 문구. "국세청 공식/제공" 오인 문구 금지.

### 3-15. 저장소 스키마 (US-2) — `createStore('np')`

| 키 | 타입 | 상한 | 비고 |
|---|---|---|---|
| `np.profile` | { anonKey, schema, createdAt } | 1KB | |
| `np.lastInput` | CalcInput | 1KB | 즉시 저장 |
| `np.scenarios` | Scenario[] | 32KB | 무료 3 / 해제 20 |
| `np.unlock` | Unlock | 1KB | |
| `np.settings` | { cardHideGross } | 1KB | |
| `np.ads` | { lastRewardAt } | 1KB | |

localStorage·IndexedDB 금지(ESLint 규칙). 마이그레이션은 `profile.schema` 기준 순차. `clearItems`는 S10 전체 삭제에서만.

### 3-16. 문구 규칙·린트 (원칙 A, B) — `runCopyLint` + `scripts/copy-rules.ts`

대상: `src/i18n/ko.json`(UI 문구), 카드 문구 템플릿.

금지어(정규식, 그룹):
- **A(금융 상품)**: `대출|적금|예금|카드 ?추천|증권|투자|펀드|주식|보험 ?상품|보험 ?가입|한도`
- **B(권고·평가)**: `추천|적정 ?연봉|불러(라|야|세요)|이직하(세요|라)|유리해|불리해|손해|이득|최적|절세|세금 ?줄이|환급 ?받는 ?법|정확한 ?세액|확실`
- **허용 예외(화이트리스트)**: `건강보험|고용보험|장기요양보험|국민연금|사회보험`, "지금 연봉이 있다면"(S01 링크 문구).

빌드: `npm run lint:copy` — 위반 시 파일·경로·문장 출력 후 exit 1.

### 3-17. 이벤트 로그 (분석)

앱인토스 로깅 가이드 형식. 사용자 식별은 anonKey 해시. **금액은 어떤 형태로도 로그에 넣지 않는다**(구간·버킷 포함).

| 이벤트 | 속성 |
|---|---|
| `app_open` | hasLastInput, unlocked, fromDeeplink |
| `calc_done` | mode(reverse/forward), dependentsSet(bool), hasChildren(bool) |
| `detail_view` | mode |
| `gate_view` | feature(timeline/compare/saveExtra) |
| `ad_rewarded_load` | ok |
| `ad_rewarded_show` | — |
| `ad_reward_earned` | — |
| `timeline_view` | fallbackYears(count) |
| `share_card_created` | hideGross(bool), via(image/link) |
| `scenario_saved` | countAfter |
| `compare_view` | — |
| `severance_done` | underOneYear(bool) |
| `leave_done` | — |
| `banner_impression` | screen |

---

## 4. 빌드·데이터 파이프라인 (DT-1 ~ DT-6)

```
data-src/tax-table/2026-03-01.xlsx  (홈택스 수동 다운로드, 원본 보존)
        │  npm run data:build  → scripts/build-tax-table.ts
        ▼
src/data/tax-table/2026-03-01.json  + 과거 시행판(확보 시)
src/data/rates.json                 (수동 편집, 행마다 출처·확인일)
        │  npm run check:data   → scripts/check-data.ts
        ▼  (a) 최신 세액표 effectiveFrom <= 오늘  (b) rates 최신 행 연도 >= 올해  (c) 1-1 무결성  (d) overCap 확정 여부  (e) 골든 20건
npm run build = check(typecheck + lint:copy + test) + check:data + check-ad-ids + vite build + ait build
```

- `build-tax-table.ts`: 엑셀 시트의 "이상/미만/1~11명" 열을 파싱. 천원 단위 표기는 원 단위로 변환. 자녀 차감·overCap 각주는 파일 상단 상수로 수동 기입(스크립트가 파싱하지 않음).
- 갱신 일정: 1월(요율·상하한), 3월경(세액표 개정 시), 7월(국민연금 상하한). 갱신 = 데이터 교체 + `check:data` + FACT_CHECK 재검증 + 재심사 제출.
- 앱은 런타임에 외부 데이터를 호출하지 않는다.

---

## 5. 비기능 요구사항

| 항목 | 기준 |
|---|---|
| 오프라인 | 계산·저장·카드 생성은 네트워크 없이 동작. 광고만 온라인 |
| 성능 | 첫 렌더 1s, 입력 후 결과 갱신 50ms 이내(디바운스 제외), 화면 전환 300ms |
| 테마 | 라이트 고정 |
| 제스처 | 핀치 확대·축소 비활성 |
| 접근성 | 숫자 입력 라벨·단위 명시, 차트 옆 텍스트 대체("2021년 실수령 …원"), 버튼 최소 44pt |
| 사운드 | 없음 |
| 권한 | 기기 권한 요청 없음(이미지 저장은 SDK 경유) |
| 개인정보 | 입력값 서버 전송 없음, 로그에 금액 없음, 전체 삭제 제공 |
| 에러 리포팅 | 콘솔 + 앱인토스 로그. 외부 SDK 미도입 |

---

## 6. 테스트 매트릭스

| 계층 | 대상 | 도구 |
|---|---|---|
| 단위 | computeNet 항목별 절사·상하한, lookupIncomeTax 경계·자녀 차감, computeGross 수렴·최소성, computeTimeline 연도 해석·fallback, severance 기간·1년 미만, leavePay, 게이트 만료, 딥링크 파서 | Vitest |
| 골든 | **22건** — 세액은 별표2 원문에서 파서와 다른 경로로 추출해 대조, 보험료는 고시 숫자 리터럴 산술로 대조, 실수령은 그 둘로 조립해 대조 (`scripts/golden.test.ts`) | Vitest + FACT_CHECK.md |
| 데이터 | 1-1 무결성, rates 연속성, overCap 확정, 단조성 전수(0~50억, 1만 원 스텝) | 스크립트 |
| 문구 | 금지어 린트, 카드·공유 텍스트 숨김 규칙 | 스크립트 + Vitest |
| 컴포넌트 | S01 첫 화면 입력 방향, 면책·기준일 문구 존재, 상한 배지 | Testing Library |
| 플랫폼 | 비게임 체크리스트 전수, QR 테스트, 광고 실노출, 저장 유지, 백버튼, 딥링크 | 수동, 체크리스트 표 |

---

## 7. 오픈 이슈

| ID | 내용 | 해결 시점 |
|---|---|---|
| ~~O-1~~ | ~~1,000만 원 초과 산식~~ → 2026-09-07 해결. 공공데이터포털에서 별표2 원본(HWPX)을 받아 파싱했다. 구간 6개, `98%를 곱한 금액의 N%` 구조이며 **구간을 누적하지 않는다**. 상한 기준 세액(11열)은 표와 별도 행이다 | 해결 |
| O-2 | 절사 규칙과 건강보험 하한 20,160원의 성격. 골든 20번이 현재 전제를 고정했지만 규칙 자체는 미증명. 국세청·공단 계산기가 모두 JS 앱이라 자동 대조 불가 → FACT_CHECK 3-2의 대조표로 수동 확인 | 출시 전 |
| O-3 | 과거·최신 시행판 확보(FACT_CHECK 3-1). 공공데이터포털은 **2024-02-29 판만** 제공한다(2026-09-07 확인). 2026-03-01 판은 홈택스에서 받아야 하고 `check:data`가 그때까지 프로덕션 빌드를 막는다. 2021·2023 판은 미확보 → 시간축에서 폴백 각주 | 진행 |
| O-4 | 2021~2022 국민연금 상하한, 고용보험 요율 변경 시점, 건강보험 보수월액 상하한 원문 대조. 미확인 행은 `rates.json`의 `needsVerification`에 남기고 시간축에 각주를 붙인다(FACT_CHECK 3-3) | 출시 전 |
| O-5 | 게이트 해제를 "광고 1회 = 전체" 대신 기능별로 나눌지. 출시 후 시청률로 판단 | 출시 후 4주 |
| ~~O-6~~ | ~~`@ait/kit` 마이그레이션 순서~~ → 2026-09-07 kit 추출 완료, net-pay는 처음부터 사용 | 해결 |
| O-7 | 세액표 원본은 홈택스에서 **수동 다운로드** 후 CSV로 저장해야 한다(엑셀 파서를 넣지 않기로 함 — 의존성 0 유지). 절차는 `scripts/build-tax-table.ts` 상단 주석 | 상시 |

## 8. 변경 이력
- 2026-09-07 v0.1 초안. PRD v0.3(협상 카드 무료, 공용 패키지, 시간축 5년) 반영.
- 2026-09-07 v0.4 골든 케이스 22건 작성(FACT_CHECK.md). O-1 근거 보강, O-2·O-4를 수동 확인 항목으로 정리.
- 2026-09-07 v0.3 실제 별표2 원본(HWPX) 파싱으로 전환. 합성 표 생성기 제거, O-1 해결, 역산 격자를 120만 원으로 재산정(실측 최대 낙폭 27,499원), 표시 연봉 보정 추가.
- 2026-09-07 v0.2 구현 반영: 세액표를 단일 `tax-tables.json`으로, 요율을 총요율+부담 비율로,
  역산을 격자 탐색+선형 보정으로 변경(단조성 반증 측정), 저소득 계단 문서화, O-6 해결·O-7 추가.
