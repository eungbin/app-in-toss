# 기능 명세 — fx-replay (가칭 "그때 환전했다면")

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.1 (2026-09-07) |
| 상위 문서 | [PRD.md](PRD.md) v0.2 — 요구사항 ID(RE-, SC-, RV-, MZ-, US-)는 PRD와 동일 |
| 데이터 근거 | [DATA_VERIFICATION.md](DATA_VERIFICATION.md) |
| 적용 범위 | **v1.0 (광고 전용, 서버 없음)** 전체 + **v1.1 (토스 로그인·인앱결제·서버)** 추가분. v1.1 전용 항목은 `[v1.1]` 표시 |
| 다음 문서 | 화면 흐름·와이어프레임 (SCREEN_FLOW.md) |

이 문서는 "무엇을 어떻게 동작시키는가"를 구현 가능한 수준으로 적는다. 화면 배치·비주얼은 다음 문서에서 다룬다.

---

## 0. 상수·용어

| 상수 | 값 | 설명 |
|---|---|---|
| `CUTOFF_MONTHS` | 12 | 번들 데이터의 마지막 날짜 = 빌드일 − 12개월 (확정) |
| `PLAY_DAYS` | 60 | 한 판의 거래일 수 (시나리오 정의로 재정의 가능, 20~120) |
| `TICK_MS` | 2000 | 1x 속도에서 하루가 넘어가는 간격. 2x = 1000ms |
| `START_P` | 1,000,000 | 시작 가상 포인트. 전액 원화 |
| `CONVERT_RATIOS` | 25, 50, 100 (%) | 전환 비율 선택지 |
| `FREE_PLAYS_PER_DAY` | 3 | 일일 무료 플레이 |
| `AD_BONUS_CAP` | 5 | 광고로 적립 가능한 미사용 추가 플레이 최대치 |
| `NOTE_LIMIT_FREE` | 10 | 무료 사용자의 복기 노트 보관 수 |
| `RECENT_SEGMENTS` | 30 | 무작위 구간 중복 방지 기억 수 |
| `SCHEMA_VERSION` | 1 | Storage 스키마 버전 |

용어: **판(Play)** = 한 번의 리플레이. **세션(Session)** = 진행 중인 판의 상태. **구간(Segment)** = 시계열의 연속 N거래일. **시나리오(Scenario)** = 미리 정의된 구간 + 사건 + 해설. **오늘의 리플레이** = 무작위 구간으로 만든 블라인드 시나리오. **P** = 가상 포인트 단위. **Entitlement** = 사용자가 소유한 유료 권한.

사용자 화면 용어(원칙 A4): "달러로 바꾸기", "원화로 바꾸기", "그대로 두기", "결과 P", "그대로 뒀다면 P". 매수·매도·수익률·포지션은 코드 내부에서만 사용한다.

---

## 1. 데이터 모델

### 1-1. 시세 파일 (`src/data/series/*.json`)

```ts
interface SeriesFile {
  id: "usdkrw" | "cnykrw";           // 자산 ID
  name: string;                        // "원/달러 환율" — 리빌 후에만 UI 노출
  source: { stat: string; items: string[]; org: "한국은행"; fetchedAt: string; cutoff: string };
  unit: "원";
  candles: Candle[];                   // 날짜 오름차순, 결손일은 행 없음
}
interface Candle {
  d: string;      // "19970103" (YYYYMMDD)
  o: number; h: number; l: number; c: number;
  f?: true;       // 시·고·저가 결손으로 종가로 채운 날
}
```

- `usdkrw`: ECOS 731Y003 항목 0000002(시가)·0000005(고가)·0000004(저가)·0000003(종가 15:30). 1990-03-02~컷오프.
- `cnykrw`: 731Y003 항목 0000007~0000010. 2014-12-01~컷오프.
- `baserate.json`: 722Y001/0101000 기준금리 `{ d, v }[]`. 사건 마커 자동 생성용(기준금리 변경일).
- 무결성 규칙(빌드 테스트): 날짜 오름차순·중복 없음, `l ≤ min(o,c)`, `h ≥ max(o,c)`, 모든 `d ≤ cutoff`, 캔들 수 ≥ 8,000(usdkrw).

### 1-2. 시나리오 (`src/data/scenarios/*.json`)

```ts
interface Scenario {
  id: string;                 // "krw-1997-crisis"
  kind: "chapter" | "daily";  // daily = 오늘의 리플레이(런타임 생성, 파일 없음)
  title: string;              // "1997 외환위기" — blind=false일 때만 플레이 전 노출
  series: "usdkrw" | "cnykrw";
  start: string;              // "19971001" — 이 날이 Day 1
  days: number;               // 기본 60
  blind: boolean;             // chapter는 false(이미 아는 구간), daily는 true
  free: boolean;
  productId?: string;         // 유료면 IAP 상품 ID (kind=chapter, free=false)
  intro: string[];            // 챕터 소개(과거형 서술, 3~5문장). 무료 열람
  events: ScenarioEvent[];    // 리빌 후 차트 마커
  debrief: string[];          // 해설 3~5문장(무료) / 유료 챕터는 8~15문장
  sources?: string[];         // 해설 근거(보도자료·연표 출처)
}
interface ScenarioEvent { d: string; label: string; body: string }  // label ≤ 14자, body ≤ 80자
```

- `start`부터 `days`개의 캔들이 시계열에 존재해야 한다(빌드 테스트). 존재하지 않으면 빌드 실패.
- `intro`·`events.body`·`debrief`·`label`은 3-12절 문구 린트를 통과해야 한다.

### 1-3. 런타임 상태

```ts
interface PlaySession {
  id: string;                    // uuid
  scenarioId: string;            // chapter id 또는 "daily:<series>:<startIdx>"
  series: "usdkrw" | "cnykrw";
  startIdx: number;              // series.candles 인덱스
  days: number;
  blind: boolean;
  day: number;                   // 현재 진행 Day (1..days). 0 = 시작 전
  speed: 1 | 2;
  status: "ready" | "playing" | "paused" | "finished" | "revealed";
  holdings: { krw: number; fx: number };   // krw: P, fx: 외화 단위(가상)
  conversions: Conversion[];
  startedAt: string; updatedAt: string;
}
interface Conversion { day: number; dir: "toFx" | "toKrw"; ratio: 25 | 50 | 100; rate: number; amountP: number }

interface PlayResult {
  sessionId: string; scenarioId: string; series: string;
  startDate: string; endDate: string;        // 리빌 후 실제 날짜
  finalP: number; benchmarkP: 1000000; diffP: number;
  conversions: Conversion[];
  completedAt: string;
}
interface ReplayNote { id: string; result: PlayResult; memo: string /* ≤100자 */; createdAt: string }
interface Badge { id: string; earnedAt: string }
interface Quota { date: string /* YYYY-MM-DD 로컬 */; used: number; bonus: number }
interface Entitlements { premium: boolean; chapters: string[]; syncedAt?: string; source: "local" | "server" }
interface Profile { anonKey: string; schema: 1; createdAt: string; userKey?: string /* v1.1 */ }
```

---

## 2. 화면 목록과 라우팅

라우터는 해시 없는 경로 기반(딥링크 `intoss://fx-replay/<path>` 매핑). 앱인토스 네비게이션 바 사용, 첫 화면(S01)에서 뒤로가기 → 미니앱 종료.

| ID | 경로 | 화면 | 버전 |
|---|---|---|---|
| S01 | `/` | 홈 | 1.0 |
| S02 | `/play` | 플레이 | 1.0 |
| S03 | `/result` | 리빌·결과·복기 | 1.0 |
| S04 | `/scenarios` | 시나리오 목록 | 1.0 |
| S05 | `/scenario/:id` | 챕터 소개 | 1.0 |
| S06 | `/scenario/:id/debrief` | 해설 챕터 (플레이 완료 후) | 1.0 |
| S07 | `/history` | 내 기록 (노트·배지·이력) | 1.0 |
| S08 | `/history/:noteId` | 복기 노트 상세 | 1.0 |
| S09 | `/settings` | 설정 | 1.0 |
| S10 | `/settings/sources` | 데이터 출처·라이선스 | 1.0 |
| S11 | `/settings/purchases` | 구매 내역·복원 | 1.1 |
| S12 | `/login-intro` | 토스 로그인 안내(인트로) | 1.1 |
| M01 | 바텀시트 | 플레이 소진 → 광고/프리미엄 | 1.0 |
| M02 | 바텀시트 | 전환 비율 선택 | 1.0 |
| M03 | 바텀시트 | 결제 확인 | 1.1 |

딥링크: `/scenario/:id` 진입 허용(공유 카드). 알 수 없는 경로는 `/`로.

---

## 3. 기능 명세

각 항목: **동작 → 상태·데이터 → 예외 → 수용 기준(AC)**.

### 3-1. 앱 시작·부트스트랩 (US-1, US-2)

동작
1. 스플래시 없이 S01을 즉시 렌더(스켈레톤). 백그라운드에서 순서대로: (a) `Storage.getItem("fxr.profile")` → 없으면 `User.getAnonymousKey()`로 생성·저장, (b) 스키마 버전 확인·마이그레이션, (c) `quota`·`entitlements`·`session` 로드, (d) 리워드 광고 프리로드(3-8), (e) `[v1.1]` entitlement 서버 동기화(3-10).
2. 진행 중 세션(`status ∈ {playing, paused}`)이 있으면 S01 상단에 "이어서 재생" 카드를 보인다.

예외
- `getAnonymousKey` 실패: 로컬 uuid로 임시 프로필 생성, `anonKeyPending=true`로 다음 시작 때 재시도. 앱은 정상 시작한다(체크리스트: 식별키 발급 후 정상 시작).
- Storage 읽기 실패: 빈 상태로 시작하고 토스트 "저장된 기록을 불러오지 못했어요". 쓰기는 계속 시도.

AC
- [ ] 콜드 스타트에서 S01 첫 렌더까지 1초 이내(중급 안드로이드 기준), 인터랙션 지연 2초 미만.
- [ ] 앱 종료 후 재진입 시 quota·노트·배지·진행 중 세션이 유지된다.
- [ ] 진입 직후 바텀시트가 자동으로 열리지 않는다.

### 3-2. 홈 (S01)

구성: 헤더 문구 "과거 차트로 배우는 판단 복기" / [오늘의 리플레이] 카드(남은 플레이 표시 "오늘 남은 리플레이 2회") / [시나리오] 카드 목록 3개 미리보기 + 더보기 / [내 기록] 최근 노트 1개 / 하단 배너 광고(프리미엄이면 없음) / 진행 중 세션 카드(있을 때만 최상단).

동작
- "오늘의 리플레이 시작": `quota.available > 0`이면 3-4 무작위 구간 생성 → S02. 0이면 M01.
- 진행 중 세션 카드 "이어서": S02로 복원(`paused` 상태로 진입). "그만두기": 확인 후 세션 삭제, quota는 환불하지 않는다.

AC
- [ ] 남은 횟수 표기가 quota 규칙(3-7)과 항상 일치.
- [ ] 배너는 스크롤 가능한 홈 하단에만 존재.

### 3-3. 리플레이 엔진 (RE-1 ~ RE-6)

상태 머신
```
ready ──start──▶ playing ──tick(day==days)──▶ finished ──reveal──▶ revealed
  ▲                │  ▲
  │             pause│  │resume
  └──restore──── paused
```
- `tick`: `day += 1`, 캔들 `candles[startIdx + day - 1]` 노출, 스냅샷 저장(3-11), `day == days`면 `finished`.
- 타이머는 `setTimeout` 체인(드리프트 무시). 탭/앱 백그라운드(`visibilitychange` hidden) → 자동 `paused`.
- `speed` 토글은 즉시 다음 tick 간격에 반영.
- `finished` → `revealed`는 사용자 탭 또는 1.5초 후 자동.

포지션 계산 (RE-4, RE-5)
- 초기 `holdings = { krw: 1_000_000, fx: 0 }`.
- 전환은 **현재 Day 캔들의 종가 `c`** 로 즉시 체결, 비용 0.
  - toFx(ratio): `amountP = krw × ratio/100; fx += amountP / c; krw -= amountP`
  - toKrw(ratio): `amountFx = fx × ratio/100; krw += amountFx × c; fx -= amountFx`
- 총 P(Day d) = `krw + fx × c_d`. 소수 둘째 자리까지 내부 보관, 표시는 정수 P(반올림).
- 전환 버튼 비활성: toFx는 `krw < 1`일 때, toKrw는 `fx × c < 1`일 때.
- 같은 Day에 여러 번 전환 가능(타이머 진행 중이므로 실질 1~2회). 하나의 Day에 같은 방향 전환은 1회로 제한하지 않는다(단순화).
- 결과: `finalP = krw + fx × c_last`, `benchmarkP = 1_000_000`, `diffP = finalP − benchmarkP`.

블라인드 표시 (RE-3)
- 정규화: `norm(x) = x / c_start × 100` (c_start = Day 1 종가). 차트·툴팁·변동폭은 정규화 값만.
- 축 라벨: "Day 1", "Day 10", …. 자산명 자리에는 "?".
- **원값·날짜는 뷰 레이어에 전달하지 않는다.** 엔진이 `BlindCandle { day, o, h, l, c }`(정규화)만 노출하고, `reveal()` 호출 후에만 `RevealedCandle { d, ... }`을 반환한다. 이는 단위 테스트로 보장한다.
- 총 P 표시는 블라인드에서도 실제 P(정규화와 무관, 원값 노출 아님).

챕터(blind=false)
- 정규화 없이 실제 값·실제 날짜 축을 처음부터 표시. 미래 캔들은 당연히 숨김. 사건 마커는 **해당 날짜가 지나간 뒤에만** 차트에 표시(스포일러 방지).

복원 (RE-6)
- 매 tick 후 `fxr.session` 저장. 복원 시 `status = paused`, 마지막 tick 직후 상태로 진입.
- 세션의 `scenarioId`가 daily면 `series+startIdx`만으로 재구성 가능. 시계열 파일 버전이 바뀌어 인덱스 불일치(캔들 `d`가 저장된 `startDate`와 다름)면 세션을 폐기하고 안내.

AC
- [ ] 60 tick 진행 시 렌더 프레임당 16ms 이내(캔들 60개, 저사양 폰).
- [ ] 백그라운드 전환 시 1초 이내 `paused`, 복귀 시 자동 재생하지 않고 "재생" 버튼 대기.
- [ ] 블라인드 세션에서 뷰 컴포넌트 props에 `d`(날짜) 또는 원값이 존재하지 않는다(테스트).
- [ ] 계산 예제: c1=1000, Day3 c=1100에서 toFx 50% → krw 500,000, fx 454.5454; Day10 c=1210에서 총 P = 500,000 + 454.5454×1210 = 1,050,000.

### 3-4. 오늘의 리플레이 — 무작위 구간 (SC-2)

알고리즘
1. `series = "usdkrw"` (v1.0 고정. cnykrw는 챕터 전용).
2. 후보 시작 인덱스 `i ∈ [0, len − PLAY_DAYS]`.
3. 제외: `recentSegments`(최근 30개 시작 인덱스) 각각의 ±30 범위, 챕터 시나리오의 `[start, start+days)`와 30일 이상 겹치는 구간(유료 콘텐츠 무료 노출 방지).
4. `crypto.getRandomValues`로 균등 추출. 후보가 비면 `recentSegments`를 비우고 재시도.
5. `scenarioId = "daily:usdkrw:<i>"`, `blind = true`, `days = 60`, events는 리빌 시 자동 생성(3-5).

AC
- [ ] 같은 날 같은 사용자에게 동일 시작 인덱스가 30판 내 재등장하지 않는다.
- [ ] 생성된 구간의 마지막 캔들 날짜 ≤ cutoff (데이터 자체가 컷오프 이하이므로 자동 충족, 테스트로 고정).

### 3-5. 리빌·결과·복기 (S03, RV-1 ~ RV-5)

리빌 시퀀스(RV-1)
1. 차트 축이 정규화 → 실제 값으로 트윈(600ms), "Day n" → 실제 날짜, "?" → 자산명.
2. 사건 마커 등장. 마커 소스: (a) 챕터면 `scenario.events`, (b) daily면 자동 생성 = 구간 내 기준금리 변경일(`baserate.json`, label "기준금리 x.xx%→y.yy%") + 구간 내 **일간 변동폭 상위 2일**(label "하루 +n.n%"/"하루 −n.n%", body 없음). 자동 마커에는 서술 문장이 없으므로 원칙 B 위반 소지가 없다.
3. 결과 카드: 결과 P / 그대로 뒀다면 1,000,000 P / 차이 P (+·− 색상만, 평가 문구 없음).
4. 복기 타임라인(RV-2): 내 전환 지점 마커. 탭 → 시트 "Day 12 · 2008-09-15 · 달러로 50% 바꿈 · 이날: 리먼브러더스 파산 신청"(같은 날 사건이 있을 때만 마지막 절 표시).
5. 해설: 챕터 `debrief`; daily는 고정 템플릿 2문장 — "이 구간은 {startDate}부터 {endDate}까지의 원/달러 환율이었다. 기간 중 최고 {max}원, 최저 {min}원을 기록했다." (사실만).
6. 출처(RV-4): `출처: ECOS(한국은행, {series.name}), 수집일 {fetchedAt}`.
7. 액션: [복기 노트 저장] [공유 카드 P1] [한 판 더] [홈].

복기 노트(RV-5)
- 저장 시 `ReplayNote` 생성, 메모 100자 제한(줄바꿈 제거). 무료 10개 초과 시 "가장 오래된 노트를 지우고 저장할까요?" 확인 → 삭제 후 저장. 프리미엄은 무제한.
- 결과는 노트 저장 여부와 무관하게 `history`(최근 50개 `PlayResult`)에 기록.

한 판 더
- quota 차감은 **판 시작 시** 이루어졌으므로 여기서는 새 판 시작 조건만 확인(3-7).

AC
- [ ] 리빌 전 화면 어디에도 날짜·자산명·원값 문자열이 렌더되지 않는다(DOM 스냅샷 테스트).
- [ ] 결과 화면·노트 상세에 출처 문구가 항상 존재.
- [ ] 결과 화면에 배너·전면 광고가 없다.

### 3-6. 시나리오 목록·챕터 소개·해설 (S04, S05, S06, SC-3)

S04 목록
- 카드: 제목, 기간 라벨("1997.10 ~ 1997.12"), 자산, 상태 배지(무료 / 소유 / 가격 `[v1.1]` / 준비 중). v1.0에서는 유료 챕터 카드에 가격 대신 "곧 열려요" 표시(결제 미탑재).
- 정렬: 무료 → 소유 → 미소유(연도순).

S05 챕터 소개
- `intro` 문단(무료 열람), 사건 수·플레이 길이 표시. CTA:
  - 무료·소유: "플레이" → quota 확인 없이 시작(챕터는 quota를 소비하지 않는다. 유료 콘텐츠와 무료 제한을 분리해 결제 가치를 명확히 함) → S02(blind=false).
  - 미소유 `[v1.1]`: "{가격}에 열기" → 3-9 결제. v1.0: 비활성 "곧 열려요".
- 재플레이 가능(무제한).

S06 해설 챕터
- 플레이 완료(`history`에 해당 scenarioId 결과 존재) 후에만 진입. `debrief` 전체 + `events` 연표 + 내 결과 요약 + `sources`.

AC
- [ ] 미소유 챕터에서 intro 이외 콘텐츠(events, debrief)가 네트워크·번들 어디서도 화면에 노출되지 않는다(번들에는 포함되지만 UI 게이트. 완전 보호는 v1.1에서 서버 게이트 검토 — 오픈 이슈 O-2).
- [ ] 챕터 플레이는 quota를 소비하지 않는다.

### 3-7. 일일 무료 플레이 (MZ-1)

규칙
- `Quota { date, used, bonus }`. `today = 로컬 날짜(YYYY-MM-DD)`.
- 로드 시 `quota.date !== today`면 `used = 0`, `date = today`. `bonus`는 유지(cap 5).
- `available = premium ? ∞ : max(0, 3 − used) + bonus`.
- 판 시작 시: `used < 3`이면 `used += 1`, 아니면 `bonus −= 1`. 저장 후 세션 생성. 시작 실패(예외)면 롤백.
- 진행 중 세션 폐기는 환불 없음. 앱 강제종료 후 복원은 차감 없음(이미 차감됨).
- 기기 시간 조작 방어: `date`가 미래로 갔다가 돌아와도 "date !== today"로만 판단하므로 하루 3판 상한은 유지된다. 이상 케이스는 허용(서버 없음).

AC
- [ ] 자정 넘긴 뒤 첫 진입에 used=0, bonus 유지.
- [ ] available=0에서 "시작" 탭 → M01만 열리고 세션은 생성되지 않는다.

### 3-8. 리워드·배너 광고 (MZ-2, MZ-3)

설정: `adGroups = { rewarded: string, banner: string }`. 개발·QR 테스트 빌드는 `ait-ad-test-rewarded-id`, 배너는 문서의 테스트 ID. 프로덕션 빌드에서 테스트 ID가 남아 있으면 빌드 실패(테스트).

리워드 상태 머신: `idle → loading → loaded → showing → (rewarded|closed|failed) → idle`
- 프리로드: S01 마운트 시 `loadFullScreenAd({ adGroupId, onEvent })`. `loaded` 수신 시 `loaded`. 실패 시 5초 후 1회 재시도, 이후 다음 홈 진입까지 대기.
- 표시: M01에서 "광고 보고 한 판 더" 탭 → 상태가 `loaded`일 때만 `showFullScreenAd`. 아니면 토스트 "지금은 광고를 불러올 수 없어요. 잠시 후 다시 시도해 주세요" (실시간 로딩 금지 체크리스트 준수).
- 보상: **`userEarnedReward` 이벤트에서만** `quota.bonus = min(bonus + 1, 5)` 저장. `dismissed`만 오면 지급 없음. 보상 후 즉시 다음 광고 프리로드(`load → show → load → show`).
- 광고 표시 중 엔진은 항상 idle(홈에서만 호출). 앱에 사운드 없음.
- 프리미엄: 리워드 진입점 자체를 숨기고 배너 미마운트.

배너: S01·S07 하단, 스크롤 컨테이너 안. S02/S03/S05/S06에는 없음. `isSupported()` false면 미렌더.

AC
- [ ] `dismissed`만 발생한 테스트에서 bonus 불변.
- [ ] `userEarnedReward` 2회 연속 → bonus 2, cap 5 초과 안 함.
- [ ] 광고 종료 후 M01이 닫히고 홈으로 복귀, "이제 한 판 더 할 수 있어요" 토스트.

### 3-9. 인앱 결제 `[v1.1]` (MZ-4, MZ-6, MZ-7)

상품
| productId | 유형 | 가격(안) | 효과 |
|---|---|---|---|
| `chapter.krw-1997-crisis` 등 챕터별 | 비소모품 | 1,500~2,900원 | `entitlements.chapters += id` |
| `premium.lifetime` | 비소모품 | 4,900원 | `entitlements.premium = true` |

흐름
1. 로그인 게이트: 결제·복원 진입 시 `profile.userKey`가 없으면 S12(서비스 설명 + 약관 URL) → `appLogin()` → 인가코드 → 서버 `POST /auth/exchange` → `userKey` 저장. 앱 최초 진입에는 로그인을 요구하지 않는다.
2. 가격 표시: S04/S05 진입 시 `IAP.getProductItemList()` 결과를 5분 캐시. 실패 시 "가격을 불러오지 못했어요" + 재시도.
3. 구매: M03 확인 → `IAP.createOneTimePurchaseOrder({ productId })` → 성공 콜백에서 즉시 로컬 entitlement 부여 → `IAP.completeProductGrant(orderId)` → 서버 동기화(3-10) 백그라운드.
4. 실패: 사용자 취소 → 조용히 M03 닫기. 잔액 부족 등 → 사유 문구 표시(체크리스트). 결제 성공 후 지급 전 앱 종료 → 다음 시작 시 `getPendingOrders()`로 지급 재시도.
5. 환불: 서버 동기화 결과 `REFUNDED`면 entitlement 제거 + 토스트.
6. S11 구매 내역: 소유 상품·구매일·주문번호, "구매 복원" 버튼(= 3-10 강제 동기화).

AC
- [ ] 샌드박스 3시나리오(성공 / 결제 성공+지급 실패 후 복구 / 취소·네트워크 오류) 통과.
- [ ] 기기 A에서 구매 → 기기 B에서 같은 토스 계정으로 로그인·복원 시 챕터 열림.
- [ ] 주문 금액과 스토어 결제창 금액 일치.

### 3-10. Entitlement 동기화·서버 `[v1.1]`

판정: `effective = server 응답이 있으면 server, 없으면 local`. 로컬은 캐시일 뿐이며 `source` 필드로 구분.

서버(무료 티어, 무상태, 3 엔드포인트)
| 메서드·경로 | 입력 | 처리 | 출력 |
|---|---|---|---|
| `POST /auth/exchange` | `{ authorizationCode, referrer }` | 토스 토큰 엔드포인트로 교환 → 사용자 정보 조회(scope: userKey만) → 복호화 | `{ userKey, token }` (token = HS256 JWT, 30일, payload {userKey}) |
| `GET /iap/owned` | `Authorization: Bearer token` | 앱인토스 주문 상태 조회 API(mTLS, `x-toss-user-key`)로 해당 사용자의 주문 조회 → `PURCHASED/PAYMENT_COMPLETED`만 소유로 집계, `REFUNDED` 제외 | `{ premium, chapters: string[], orders: [{orderId, productId, status, at}] }` |
| `POST /iap/notify` | 앱인토스 결제 알림 URL 페이로드 | 서명 검증 후 로그만(무상태). 향후 환불 즉시 반영용 | 200 |

- 클라이언트 동기화 시점: 앱 시작(백그라운드), 구매 성공 직후, S11 "구매 복원", 로그인 직후.
- 오류: 네트워크 실패 시 로컬 유지, 24시간 이상 동기화 실패면 S11에 경고 배지.
- 로그인 연결 해제 감지(`appLogin` 재요청 시 약관 화면 노출)면 로컬 entitlement·userKey·노트를 삭제(체크리스트: 연결 끊으면 사용자 데이터 미잔존).
- 주문 상태 조회 API의 정확한 요청·응답 스키마는 구현 시 개발자 문서로 확정(오픈 이슈 O-1).

### 3-11. 저장소 스키마 (US-2)

모든 값은 JSON 문자열, 앱인토스 `Storage.setItem/getItem/removeItem`. localStorage·IndexedDB 사용 금지(ESLint 규칙으로 차단).

| 키 | 타입 | 크기 상한 | 비고 |
|---|---|---|---|
| `fxr.profile` | Profile | 1KB | |
| `fxr.quota` | Quota | 1KB | |
| `fxr.session` | PlaySession \| null | 8KB | 매 tick 저장 |
| `fxr.history` | PlayResult[] (최근 50) | 64KB | FIFO |
| `fxr.notes` | ReplayNote[] | 128KB | 무료 10 / 프리미엄 무제한(상한 500) |
| `fxr.badges` | Badge[] | 2KB | |
| `fxr.entitlements` | Entitlements | 4KB | |
| `fxr.recentSegments` | number[] (30) | 1KB | |
| `fxr.ads` | { lastRewardAt } | 1KB | |

- 쓰기는 debounce 없이 즉시(tick 저장은 2초 간격이라 충분). 쓰기 실패는 재시도 1회 후 무시·로그.
- 마이그레이션: `profile.schema < SCHEMA_VERSION`이면 순차 마이그레이터 실행. v1은 초기 버전.
- `clearItems`는 설정 > "모든 기록 삭제"(확인 2단계)에서만.

### 3-12. 문구 규칙·린트 (원칙 B, C)

대상: `scenarios/*.json`의 `title, intro, events.label, events.body, debrief`, 그리고 `src/i18n/ko.json`(UI 문구).

금지어(정확 일치·활용형 포함, 정규식):
`지금|현재|타이밍|사라|팔아라|사세요|파세요|노리|노려|추천|유망|전략|패턴|이럴 때|다음에는|앞으로|전망|예상된다|될 것이다|수익 내는|수익률 랭킹|매수|매도|포지션|승리|클리어|레벨|콤보|연승|랭킹|1위`

허용 형식: 문장 종결은 과거형(`~했다`, `~였다`, `~있었다`, `~기록했다`) 또는 명사형 연표. 평가 어휘(`잘|아쉽|성공|실패|최고의|최악의`)는 debrief에서 금지(사건 서술의 "실패한 협상" 같은 경우는 화이트리스트로 예외 등록).

빌드: `npm run lint:copy` — 위반 시 파일·경로·문장 출력 후 exit 1. CI 필수.

### 3-13. 이벤트 로그 (분석)

앱인토스 로깅 가이드 형식. 사용자 식별은 anonKey 해시.

| 이벤트 | 속성 |
|---|---|
| `app_open` | hasSession, quotaAvailable |
| `play_start` | scenarioKind, scenarioId(챕터만), blind, source(home/scenario/deeplink) |
| `convert` | day, dir, ratio |
| `play_finish` | day, conversions |
| `reveal` | scenarioId, diffP(부호만: pos/neg/zero) |
| `note_save` | hasMemo |
| `quota_exhausted` | used, bonus |
| `ad_rewarded_load` | ok |
| `ad_rewarded_show` | — |
| `ad_reward_earned` | bonusAfter |
| `banner_impression` | screen |
| `iap_view` `[v1.1]` | productId, screen |
| `iap_success` / `iap_fail` `[v1.1]` | productId, reason |
| `share_create` (P1) | scenarioId |

결과 P 절대값·환율 값은 로그에 넣지 않는다(개인 성과 데이터 최소화).

### 3-14. 배지 (P1, US-5)

| id | 조건 | 문구 |
|---|---|---|
| `first_reveal` | 첫 리빌 | 첫 복기 |
| `through_1997` | 1997 챕터 완료 | 외환위기를 지나온 사람 |
| `through_2008` | 2008 챕터 완료 | 금융위기를 지나온 사람 |
| `ten_plays` | 리빌 10회 | 열 번의 복기 |
| `five_notes` | 노트 5개 | 기록하는 사람 |
| `all_free` | 무료 챕터 + daily 30회 | 꾸준한 복기 |

결과 P·차이 P는 어떤 배지 조건에도 쓰지 않는다. 획득 시 결과 화면 하단에 조용한 토스트(전면 연출 없음).

### 3-15. 공유 카드 (P1, US-4)

- 결과 화면 "공유" → 캔버스로 1080×1350 이미지 생성: 실제 차트(리빌 후) + 전환 지점 + 문구 "나는 {YYYY년 M월}을 이렇게 지나왔다" + 앱 이름 + ECOS 출처. **결과 P·차이 P 비노출.**
- `getTossShareLink("/scenario/<id>", ogImageUrl)`; daily는 `/`로. OG 이미지는 정적 기본 이미지(무료 호스팅).
- 스킴은 `intoss://`만.

---

## 4. 빌드·데이터 파이프라인

`scripts/fetch-ecos.ts` (Node, 수동 실행, 연 1회)
1. `ECOS_API_KEY` 환경변수. `CUTOFF = today − 12개월` (YYYYMMDD).
2. 731Y003 항목 4개 × `StatisticSearch/{KEY}/json/kr/1/20000/731Y003/D/19900101/{CUTOFF}/{ITEM}`. 응답 `list_total_count`와 행 수 일치 확인.
3. 날짜 키 병합 → 결손 보정(`f`) → 무결성 검사(1-1) → `series/usdkrw.json` 기록. 동일하게 cnykrw(2014-12-01~), baserate(722Y001/0101000).
4. 헤더 `source.fetchedAt = today`, `source.cutoff = CUTOFF`.
5. `scripts/verify-data.test.ts`: 최대 `d` ≤ cutoff, 시나리오 구간 존재, 캔들 규칙. CI 필수.

번들: Vite 프로덕션 빌드 + 앱인토스 CLI 패키징. 데이터 포함 총 5MB 이하 목표(100MB 상한).

---

## 5. 비기능 요구사항

| 항목 | 기준 |
|---|---|
| 오프라인 | 플레이·리빌·노트·챕터 열람은 네트워크 없이 동작. 광고·결제만 온라인 |
| 성능 | 첫 렌더 1s, tick 렌더 16ms, 화면 전환 300ms |
| 테마 | 라이트 고정 |
| 제스처 | 핀치 확대·축소 비활성 |
| 접근성 | 차트 옆에 텍스트 대체("Day 12, 100 대비 104.2"), 버튼 최소 44pt |
| 사운드 | 없음 |
| 권한 | 기기 권한 요청 없음 |
| 보안 | 서버 토큰은 Storage에만, 로그에 미출력. 시세 데이터는 공개 데이터라 보호 대상 아님 |
| 에러 리포팅 | 콘솔 + 앱인토스 로그. 외부 SDK(Sentry 등) 미도입(비용 0·정책 단순화) |

---

## 6. 테스트 매트릭스

| 계층 | 대상 | 도구 |
|---|---|---|
| 단위 | 포지션 계산, 정규화, 무작위 구간 제외 규칙, quota 리셋, 광고 보상 상태머신, entitlement 판정 | Vitest |
| 빌드 | 컷오프, 데이터 무결성, 시나리오 구간 존재, 문구 린트, 테스트 광고 ID 잔존 | Vitest + 스크립트 |
| 컴포넌트 | 블라인드 뷰에 날짜·원값 부재, 결과 화면 출처 문구 존재 | Testing Library |
| 플랫폼 | 체크리스트(비게임) 전수, QR 테스트, 광고 실노출, 저장 유지, 백버튼 | 수동, 체크리스트 표 |
| 결제 `[v1.1]` | 샌드박스 3시나리오 + 기기 변경 복원 | 수동 |

---

## 7. 오픈 이슈

| ID | 내용 | 해결 시점 |
|---|---|---|
| O-1 | 앱인토스 주문 상태 조회 API의 정확한 요청·응답 스키마(사용자 단위 조회 가능 여부) | v1.1 착수 시 문서·채널톡 확인 |
| O-2 | 유료 챕터의 해설·사건 데이터가 번들에 포함되면 기술적으로 추출 가능. v1.1에서 서버가 챕터 JSON을 entitlement 확인 후 내려주는 방식으로 전환할지 | v1.1 설계 |
| O-3 | 1x 속도 2초/일이 실제로 적절한지(60일 = 2분). 테스트 후 1.5초 조정 가능 | 프로토타입 |
| O-4 | KRX 승인 결과에 따른 KOSPI 시나리오·용어("매수/매도" 허용 여부) | 승인 후 |
| O-5 | 리빌 후 자동 마커의 "하루 ±n.n%" 표기가 원칙 B에서 안전한지 사전 상담 때 함께 확인 | 사전 상담 |

## 8. 변경 이력
- 2026-09-07 v0.1 초안. 컷오프 12개월·릴리즈 분할 확정 반영.
