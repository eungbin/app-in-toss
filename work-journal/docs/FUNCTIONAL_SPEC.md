# 기능 명세 — work-journal ("근무수첩")

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.1 (2026-09-09) |
| 상위 문서 | [PRD.md](PRD.md) v0.1 확정 — 요구사항 ID(CE-, DT-, UI-, MZ-, US-)는 PRD 와 동일 |
| 근거 | [LEGACY_SCREENS.md](LEGACY_SCREENS.md) 구판 화면 11장 |
| 공용 코드 | [../../docs/SHARED_PACKAGE.md](../../docs/SHARED_PACKAGE.md) `@ait/kit`, net-pay 공제 엔진 복사 |
| 적용 범위 | **v1.0 (광고 전용, 서버 없음)**. P1·P2 는 `[P1]` `[P2]` 표시 |
| 관련 문서 | [SCREEN_FLOW.md](SCREEN_FLOW.md), FACT_CHECK.md(작성 예정) |

"무엇을 어떻게 동작시키는가" 를 구현 가능한 수준으로 적는다. 배치·비주얼은 SCREEN_FLOW.

---

## 0. 상수·용어

| 상수 | 값 | 설명 |
|---|---|---|
| `DAY_MIN` | 1,440 | 하루(분) |
| `NIGHT_START` / `NIGHT_END` | 22:00 / 06:00 | 야간근로 구간(근로기준법 제56조 제3항) |
| `DAILY_STD_MIN` | 480 | 1일 법정 근로 8시간 — 초과분이 연장 |
| `OT_RATE` / `NIGHT_RATE` | 0.5 / 0.5 | 연장·야간 가산율(5인 이상) |
| `HOL_RATE_IN8` / `HOL_RATE_OVER8` | 0.5 / 1.0 | 휴일 8시간 이내·초과 가산율 |
| `WEEKLY_HOLIDAY_MIN_HOURS` | 15 | 주휴 지급 기준 주 소정근로 15시간 |
| `WEEKLY_HOLIDAY_CAP_MIN` | 480 | 주휴시간 상한 8시간 |
| `WEEKLY_STD_MIN` | 2,400 | 주 40시간 — 주휴시간 분모 |
| `MIN_WAGE[2026]` / `[2025]` | 10,320 / 10,030 | 최저임금 시급(legal.json) |
| `DAILY_LABOR_DEDUCT` | 150,000 | 일용근로 일 공제액 |
| `DAILY_LABOR_RATE` | 0.06 × (1 − 0.55) = 0.027 | 일용근로 원천징수 실효율 |
| `BUSINESS_RATE` | 0.03 | 사업소득 원천징수(지방 0.3% 별도) |
| `SMALL_TAX_FLOOR` | 1,000 | 소액부징수 — 원천징수세액 1,000원 미만은 0 |
| `MAX_SHIFT_MIN` | 1,440 | 기록 1건 최대 길이 |
| `WORKPLACE_FREE` | 1 | 무료 근무지 수 |
| `MONTHS_FREE_BACK` | 2 | 무료로 볼 수 있는 과거 월 수(이번 달 + 2) |
| `SCHEMA_VERSION` | 1 | Storage 스키마 |

용어: **기록(Record)** = 근무 1건(출근~퇴근). **실근무(work)** = 퇴근 − 출근 − 휴게. **분해(split)** = 실근무를 야간·연장·휴일로 나눈 것. **일급(dayPay)** = 기본급 + 가산 + 추가수당. **주(week)** = 월~일. **확정(settled)** = 주의 일요일이 오늘 이전. **세전(gross)** = 월 일급 합 + 확정 주휴. **공제(deductions)** = 소득세·지방소득세·4대보험 근로자 부담분. **실수령(net)** = 세전 − 공제.

화면 용어(원칙 B3): "예상 실수령액", "참고액", "예상 급여". 금지: "체불", "위반", "미달", "신고".

---

## 1. 데이터 모델

### 1-1. 법정 상수 (`src/data/legal.json`)
```ts
interface LegalFile {
  minWage: { year: number; hourly: number; source: { label; url; checkedAt } }[];
  night: { start: "22:00"; end: "06:00" };
  rates: { overtime: 0.5; night: 0.5; holidayIn8: 0.5; holidayOver8: 1.0 };
  weeklyHoliday: { minHours: 15; capMinutes: 480; stdWeekMinutes: 2400 };
  dailyLabor: { deduct: 150000; taxRate: 0.06; reduction: 0.55 };
  business: { taxRate: 0.03 };
  smallTaxFloor: 1000;
  sources: { label; url; checkedAt }[];   // 근로기준법 제11·50·53·55·56조, 시행령 별표 1·제30조, 소득세법 제47·86·129·134조
}
```
무결성(빌드 테스트): `minWage` 에 올해 행 존재, `checkedAt` 1년 초과 경고·2년 초과 실패.

### 1-2. 공제 데이터
`src/data/rates.json`, `src/data/tax-tables.json` — net-pay 와 **동일 스키마·동일 내용**(복사). 갱신은 net-pay 가 먼저 하고 이 앱이 복사한다.

### 1-3. 런타임 모델
```ts
type IncomeType = 'employee' | 'daily' | 'business';   // 일반 근로 / 일용 근로 / 사업소득
type Color = 'purple' | 'blue' | 'green' | 'orange' | 'red';

interface Workplace {
  id: string; name: string;
  hourlyWage: number;                 // 원
  fivePlus: boolean;                  // 사업장 규모 5인 이상
  payday: number;                     // 1~31, 표시용
  incomeType: IncomeType;
  weeklyHolidayAuto: boolean;         // 주휴수당 자동 계산
  // 아래는 incomeType === 'employee' 일 때만 의미
  dependents: number;                 // 1~11
  children: number;                   // 0~10
  nonTaxableMonthly: number;          // 원
  taxRatio: 0.8 | 1 | 1.2;
  insurance: { nps: boolean; nhis: boolean; ei: boolean };   // 건강·장기요양은 nhis 하나
  reportedMonthly: number;            // 월 보험 신고 보수. 0 이면 세전 사용
  color: Color;
  createdAt: string;
}

interface WorkRecord {
  id: string; workplaceId: string;
  date: string;                       // 출근 날짜 "YYYY-MM-DD" — 월 귀속 기준
  start: number; end: number;         // 분(00:00 기준). end <= start 면 다음 날 퇴근
  breakMin: number;                   // 휴게(분)
  extraPay: number;                   // 추가수당(원)
  holiday: boolean;                   // 휴일 근무
  memo: string;
}

interface ShiftSplit { work: number; night: number; overtime: number; holidayIn8: number; holidayOver8: number; }  // 분
interface DayPay { base: number; overtimePay: number; nightPay: number; holidayPay: number; extra: number; total: number; }  // 원
interface WeeklyHoliday { weekStart: string; workplaceId: string; workMin: number; eligible: boolean; holidayMin: number; pay: number; settled: boolean; }
interface WorkplaceMonth {
  workplaceId: string; workMin: number; days: number;
  dayPayTotal: number; extraTotal: number; addedTotal: number;   // addedTotal = 연장+야간+휴일 가산
  weeklyHolidayCount: number; weeklyHolidayPay: number; pendingWeeklyHoliday: WeeklyHoliday | null;
  gross: number;
  deductions: { incomeTax: number; localTax: number; nps: number; nhis: number; ltc: number; ei: number; total: number };
  net: number;
}
interface MonthSummary { month: string; workMin: number; days: number; gross: number; weeklyHolidayPay: number; deductions: number; net: number; byWorkplace: WorkplaceMonth[]; lockedWorkplaceIds: string[]; }
interface Unlock { until: number | null; }
```

---

## 2. 화면 목록과 라우팅

단일 경로. 딥링크 `intoss://work-journal/` → S01. 시트는 라우트가 아니라 상태다. 뒤로가기: 시트 열림 → 닫기(`pushBackHandler`), S01 → 미니앱 종료.

| ID | 화면 | 게이트 |
|---|---|---|
| S01 | 홈(월 단위): 실수령 카드 · 급여 계산 카드 · 달력 · 기록 목록 · 배너 · 고정 버튼 | 3개월 이전 월 ● |
| S02 | 공유 카드 미리보기(전체 화면) | — |
| M01 | 기록 시트(추가·수정·삭제) | — |
| M02 | 근무지 시트(추가·수정·삭제) | 2번째 이상 추가 ● |
| M03 | 설정 시트 | — |
| M04 | 게이트 시트 "광고 보고 오늘 하루 열기" | |
| M05 | 확인 다이얼로그(기록 삭제 / 근무지 삭제 / 전체 삭제) | |

---

## 3. 기능 명세

각 항목: **동작 → 상태·데이터 → 예외 → 수용 기준(AC)**.

### 3-1. 시작·부트스트랩 (US-1, US-2)

**진입 시 어떤 시트도 자동으로 열지 않는다.** 2026-09-10 심사에서 근무지 시트 자동 오픈이
반려됐다 — "미니앱 접속 직후 바텀시트가 바로 노출돼요." PRD 2-4 D3 에 이미 있던 규칙인데
근무지 시트만 예외로 뒀던 것이 잘못이었다. **예외를 두지 않는다.**
동작
1. Storage 에서 `wj.schema`, `wj.workplaces`, 현재 월 `wj.records.YYYY-MM`(+ 인접 2개월, 주 경계용), `wj.unlock`, `wj.profile` 로드. 프로필 없으면 `loadAnonProfile` 로 생성.
2. **언제나 S01 을 그린다. 시트를 자동으로 열지 않는다.** 근무지가 0개여도 빈 홈을 보여 주고, 하단 고정 버튼이 [근무지 등록하기] 로 바뀌어 다음 할 일을 가리킨다(3-9).
3. `configureAds` → 리워드 프리로드. 오늘 날짜로 월 선택.

예외: Storage 실패 → 빈 상태 + 토스트 "저장된 기록을 불러오지 못했어요". anon 실패 → 임시 id.

AC
- [ ] 콜드 스타트 첫 렌더 1초 이내. **진입 즉시 시트가 열리지 않는다** — 예외 없다(2026-09-10 심사 반려 사유).
- [ ] 재진입 시 마지막에 보던 월이 아니라 **이번 달**을 연다(기록장은 현재가 기본).

### 3-2. 시간 분해 (CE-1) — `splitShift(rec): ShiftSplit`
동작 (분 단위, 모두 정수)
1. `s = rec.start`, `e = rec.end < s ? rec.end + DAY_MIN : rec.end`. `D = e − s` (≤ `MAX_SHIFT_MIN`).
2. `nightRaw` = `[s, e)` 와 야간 구간 `⋃k [1440k, 1440k+360) ∪ [1440k+1320, 1440k+1440)` (k = 0, 1) 의 겹침 분.
3. `work = max(0, D − breakMin)`.
4. **휴게는 야간에서 먼저 뺀다**: `night = max(0, nightRaw − breakMin)`.
5. `holiday` 이면 `holidayIn8 = min(work, 480)`, `holidayOver8 = work − holidayIn8`, `overtime = 0`. 아니면 `overtime = max(0, work − 480)`, 휴일 0.

예외: `breakMin > D` → 입력 검증에서 차단(시트에 "휴게시간이 근무시간보다 길어요"). `D === 0` → 차단.

AC
- [ ] 09:00~18:00, 휴게 60 → work 480, night 0, overtime 0 (구판 화면 값).
- [ ] 18:00~02:00, 휴게 60 → D 480, nightRaw 240(22~02), night 180, work 420, overtime 0.
- [ ] 20:00~06:00, 휴게 60 → D 600, nightRaw 480, night 420, work 540, overtime 60.
- [ ] 09:00~19:00 휴일 → holidayIn8 480, holidayOver8 60, overtime 0.
- [ ] 자정 넘김 `end < start` 처리, `end === start` 차단.

### 3-3. 일급 (CE-2) — `dayPay(split, rec, wp): DayPay`
동작 (원 단위 절사, 분 → 시간은 `min × wage / 60` 을 마지막에 `floor`)
1. `base = floor(work × wage / 60)`.
2. `wp.fivePlus` 일 때만: `overtimePay = floor(overtime × wage × 0.5 / 60)`, `nightPay = floor(night × wage × 0.5 / 60)`, `holidayPay = floor(holidayIn8 × wage × 0.5 / 60) + floor(holidayOver8 × wage × 1.0 / 60)`. 5인 미만은 셋 다 0(시간은 3-2 그대로 표시).
3. `extra = rec.extraPay`. `total = base + overtimePay + nightPay + holidayPay + extra`.

AC
- [ ] 10,320원 · 480분 → base 82,560, total 82,560 (LEGACY 3장).
- [ ] 5인 이상 · 18:00~02:00 휴게 60 → base 72,240, nightPay 15,480(180분), total 87,720. 5인 미만 → 72,240.
- [ ] 5인 이상 · 휴일 09:00~19:00 휴게 0 → base 103,200, holidayPay 41,280(480분×0.5) + 20,640(120분×1.0) = 61,920, total 165,120.
- [ ] 골든 20+ 케이스는 FACT_CHECK 에서 원문 산술로 고정.

### 3-4. 주휴수당 (CE-3) — `weeklyHoliday(records, wp, weekStart, today): WeeklyHoliday`
동작
1. 주 = `weekStart`(월요일) ~ +6일(일요일). 그 근무지 기록 중 `date` 가 주 안인 것의 `work` 합 = `workMin`.
2. `eligible = wp.weeklyHolidayAuto && workMin >= 15 × 60`. 기록된 날은 출근한 날로 본다(결근 개념 없음).
3. `holidayMin = min(480, floor(workMin / 5))` (= workMin ÷ 40h × 8h). `pay = eligible ? floor(holidayMin × wage / 60) : 0`.
4. `settled = 일요일 < today` (날짜 비교, 기기 로컬). 미확정 주는 `pay` 를 계산해 두되 합계에 넣지 않는다(3-5).
5. **월 귀속** = 일요일이 속한 월.

예외: 소득 유형이 `daily`·`business` 여도 토글이 켜져 있으면 계산한다(주휴는 근로 형태의 문제이지 세금 유형이 아니다). 기본값은 `employee` 만 on.

AC
- [ ] 주 14.5h → 0, 15h → holidayMin 180 → 10,320 × 3 = 30,960, 16h → 192분 → 33,024, 40h → 480분 → 82,560, 48h → 480분(상한).
- [ ] 2026-09-08·09 각 8h, today 09-09 → eligible true, settled false → 합계 0 (구판 화면 "0회" 재현).
- [ ] 같은 기록, today 09-14 → settled true, 1회 33,024원.
- [ ] 9월 28일(월)~10월 4일(일) 주는 **10월** 에 귀속.

### 3-5. 월 집계 (CE-4, CE-6) — `monthSummary(records, workplaces, month, today, unlocked): MonthSummary`
동작
1. 대상 기록 = `date` 가 `month` 인 것. 잠긴 근무지(3-10) 기록은 `lockedWorkplaceIds` 로만 보고 합계에서 제외.
2. 근무지별: `workMin`, `days`(고유 날짜 수), `dayPayTotal = Σ total`, `extraTotal`, `addedTotal = Σ (overtimePay + nightPay + holidayPay)`.
3. 주휴: 그 월에 귀속되는 주 전부(일요일이 월 안) 중 `settled && eligible` → `weeklyHolidayCount`, `weeklyHolidayPay`. 진행 중인 주(오늘 포함)는 `pendingWeeklyHoliday` 로 따로.
4. `gross = dayPayTotal + weeklyHolidayPay`. 공제는 3-6. `net = gross − deductions.total`.
5. 전체 = 근무지 합.

AC
- [ ] 2건 × 82,560 → workMin 960, days 2, gross 165,120 (구판 화면).
- [ ] 잠긴 근무지가 있으면 합계에서 빠지고 목록에 "잠김" 이 표시된다.

### 3-6. 공제 (CE-5) — `deductions(wp, wm): WorkplaceMonth['deductions']`
동작 — 소득 유형별
- **employee**: `b = computeNet(gross × 12, { dependents, children, nonTaxableMonthly, taxRatio, asOf: 오늘 })` (net-pay 복사). `computeNet` 은 `floor(annual/12)` 를 쓰므로 월 값이 그대로 들어간다(테스트로 고정). `reportedMonthly > 0` 이면 보험 4항목은 `computeNet(reportedMonthly × 12, …)` 의 값을 쓴다(세금은 실제 세전 기준). 토글이 꺼진 보험은 0 (`nhis` off → nhis·ltc 둘 다 0).
- **daily**: 기록마다 `taxable = max(0, total − 150,000)`, `tax = floor10(taxable × 0.027)`, `tax < 1,000 → 0`(소액부징수, 일 지급 가정), `local = floor10(tax × 0.1)`. 월 합. 보험 0. 근무지 폼에서 세금·4대보험 섹션 숨김.
- **business**: `tax = floor10(gross × 0.03)`, `tax < 1,000 → 0`, `local = floor10(tax × 0.1)`. 보험 0.

AC
- [ ] employee, 세전 165,120, 가족 1, 보험 3종 on → nps 19,475 · nhis 10,080 · ltc 1,320 · ei 1,480 · 소득세 0 → total 32,355, net 132,765 (net-pay 엔진 값. 구판 27,650 은 따르지 않는다 — LEGACY 3-1).
- [ ] 보험 전부 off → total 0.
- [ ] daily: 일급 82,560 → taxable 0 → 0. 일급 200,000 → 산출 3,000 − 공제 1,650 = 1,350, local 130. 일급 180,000 → 810 → 소액부징수로 0.
- [ ] business: 165,120 → 4,950, local 490. 30,000 → 900 (1,000원 미만이지만 징수한다).

### 3-7. 기록 시트 (M01, UI-4)
구성: 근무지(1개면 숨김, 기본 = 마지막 사용) · 날짜(기본 = 탭한 날짜 또는 오늘) · 출근 · 퇴근(15분 단위 `time`) · 휴게(분, 기본 60 — 마지막 사용값 기억) · 추가수당(원, 기본 0) · 휴일 근무 토글 · 메모 · **미리보기** · [저장] · (수정 시) [삭제].

동작
- 값이 바뀔 때마다 3-2·3-3 으로 미리보기 갱신: `실근무 n시간 m분` / `기본급` / (>0 일 때만) `연장 n분 +원` `야간 n분 +원` `휴일 +원` / (>0) `추가수당` / **예상 급여**. 5인 미만이면 가산 행 대신 각주 "5인 미만 사업장은 가산이 붙지 않아요. 야간 n분 · 연장 n분".
- 각주 고정: "야간은 22:00~06:00 기준이며 휴게시간은 야간 구간에서 먼저 차감해요."(구판 문구).
- 저장 → `wj.records.YYYY-MM` 에 추가/갱신 → 시트 닫기 → S01 갱신. 같은 날 같은 근무지 여러 건 허용.
- 삭제 → M05 → 제거.

예외 셋. 모두 저장 버튼을 비활성으로 만든다.
- 퇴근 = 출근 → "출근과 퇴근이 같아요"
- 휴게 ≥ 근무 → "휴게시간이 근무시간보다 길어요"
- **다른 기록과 시간이 겹침** → "{날짜} {출근}–{퇴근} 기록과 겹쳐요". 근무지를 가리지 않고 검사한다 — 한 사람이 같은 시간에 두 곳에서 일할 수는 없다. 맞닿은 구간(18:00 퇴근 / 18:00 출근)은 겹친 것이 아니다. 자정을 넘는 기록은 절대 분 구간으로 환산해 비교한다(`absSpan`)

AC
- [ ] 구판 기본 케이스(09:00~18:00, 60분)에서 미리보기 82,560원.
- [ ] 자정 넘김이면 퇴근 옆 "다음 날" 배지.
- [ ] 시트 열림 중 뒤로가기 = 닫기.

### 3-8. 근무지 시트 (M02, UI-5)
구성(구판 필드 14개, LEGACY 2-5): 이름 · 시급(기본 올해 최저임금, 각주 "{Y}년 최저임금은 시간당 {n}원이에요") · 사업장 규모 세그먼트(각주 "5인 이상을 선택하면 야간·연장·휴일 가산 참고액을 계산해요") · 급여일 · 소득 유형 세그먼트(각주) · 주휴수당 자동 계산 토글(각주 "주 15시간 이상이고 기록한 날을 모두 출근한 주를 계산해요") · **[employee 만]** 공제대상 가족 · 자녀 · 월 비과세 · 간이세액표 비율 · 보험 토글 3 · 월 보험 신고 보수(각주) · 표시 색상 · [저장] · (수정 시) [삭제].

동작
- 기본값: fivePlus false, incomeType employee, weeklyHolidayAuto **true**, dependents 1, children 0, nonTax 0, taxRatio 1, 보험 3종 **true**, reported 0, color = 미사용 색 중 첫 번째.
- 시급이 올해 최저임금보다 낮으면 각주를 강조색으로 바꾼다. **판정 문구는 쓰지 않는다**(B3).
- 2번째 이상 근무지 추가는 3-10 게이트 — 해제 안 됐으면 [추가] 탭 시 M04.
- 삭제: 기록이 있으면 M05 "기록 n건도 함께 지워져요".

AC
- [ ] 소득 유형을 daily/business 로 바꾸면 세금·4대보험 섹션이 접힌다.
- [ ] 이름 빈칸·시급 0 → 저장 비활성.

### 3-9. 홈 (S01, UI-1~3)
구성: 월 네비 `‹ {Y}년 {M}월 ›` + ⚙ / 카드 A / 카드 B / 달력 / 기록 목록 / 배너 / 고정 [+ 근무 기록하기].

동작
- 카드 A: `net` 큰 숫자, 3열 `세전 급여 / 주휴수당 / 예상 공제(−)`, 우측 상단 [공유] → S02.
- 카드 B `{n}시간 · {d}일`: 근무 급여(= Σ base + extra) / 가산 `+` (addedTotal > 0 일 때만 행 표시) / 주휴수당 `{count}회` `+` / (pending 있으면 회색 행 "이번 주 주휴 예정 +원 · 일요일 지나면 확정") / **세전 급여** / 소득세·지방소득세 `−` / 4대보험 근로자 부담분 `−` / **예상 실수령액**. 근무지 2개 이상이면 행 탭으로 근무지별 펼침 `[P1]`.
- 달력: 기록 있는 날 색 점(근무지 색, 2개 이상이면 점 2개) + 금액 축약(10만 미만 `83천`, 그 위 `16.5만`·`120만`). 날짜 탭 → M01(그 날짜). 잠긴 월은 카드 A·B 가 자리표시자 + 🔒, 달력·목록 비표시.
- 기록 목록: 최신순, 항목 = `M월 D일 (요일)` / `{근무지} · HH:MM–HH:MM · n시간` / `{total}원`. 탭 → M01 수정. 빈 상태 문구 구판 그대로.
- 월 네비는 **잠긴 달로도 넘어간다**(36개월 한계). 경계에서 막으면 자리표시자를 볼 방법이 없어 "지난 기록이 잠겼다"는 사실이 사용자에게 보이지 않는다. 잠긴 달에서는 카드 A·B 대신 자리표시자를 그리고, 달력·목록을 감춘다. 자리표시자와 **하단 고정 버튼 둘 다** 3-10 을 연다 — 잠긴 달에 기록을 만들면 저장한 것이 잠금 뒤로 사라져 보인다.

AC
- [ ] 기록 0건: 카드 A 0원, 카드 B 전부 0, 빈 상태 문구.
- [ ] 구판 화면 2건 케이스에서 카드 B 세전 165,120, 공제 32,355(net-pay), 실수령 132,765.
- [ ] 배너는 스크롤 마지막, 고정 버튼과 겹치지 않는다(고정 버튼 높이 + safe-bottom 만큼 하단 패딩).

### 3-10. 게이트·해제 (MZ-1) — kit `gate` 패턴
게이트 기능: `secondWorkplace`(근무지 2개 이상 등록·집계), `olderMonth`(이번 달 − 3 이전).
- `isUnlocked = until !== null && now < until`. 해제 시 `until = 기기 로컬 다음 자정`.
- 잠금 중 근무지 2개 이상이 이미 있으면(해제 만료) **첫 근무지만 집계**, 나머지는 "잠김" 표시. 기록은 지우지 않는다.
- M04: 제목 "오늘 하루 열기", 본문 "광고를 보면 오늘 자정까지 근무지를 여러 개 쓰고 지난 기록을 볼 수 있어요", [광고 보고 열기] / [다음에].

AC
- [ ] `dismissed` 만 → 불변. 23:59 해제 → 00:00 잠금.
- [ ] 잠금 중에도 첫 근무지의 기록·실수령·CSV·공유는 전부 동작.

### 3-11. 광고 (MZ-2, MZ-3) — kit `ads`
net-pay 3-9 와 동일. 배너는 S01 스크롤 마지막에만. 시트·S02 에 없음. 프리로드는 S01 마운트.

### 3-12. 공유 카드 (S02, UI-7) — 무료
1. 캔버스 1080×1350. 헤드라인 `{M}월, {n}시간 일하고`, 큰 숫자 `예상 실수령 {net}원`, 부제 `세전 {gross}원 · 주휴 {count}회 · 근무지 {k}곳`, 면책 `예상액 · 근로기준법·간이세액표 기준`, 푸터 `근무수첩 · 토스에서 열기`.
2. 토글 "금액 숨기기" → 숫자 자리에 시간만(`{n}시간 일했어요`). 상태 `wj.settings.cardHideMoney`.
3. [이미지 저장] `saveCardImage`, [링크 공유] `shareLink('work-journal', '/', text)`. 숨김 시 텍스트에서 금액 제거.

AC
- [ ] 숨김 on 이미지·텍스트에 `원` 숫자 없음(문자열 테스트).
- [ ] 면책 한 줄 항상 포함.

### 3-13. CSV 내보내기 (US-4) — **O-1 해결(2026-09-09)**
SDK 3.x `File.saveBase64({ data, fileName, mimeType })` 가 임의 MIME 을 받는다(`SaveBase64DataParams.mimeType: string`). kit 의 `saveCardImage` 는 같은 API 의 구 이름(`saveBase64Data`, deprecated)을 PNG 고정으로 감싼 것이다. **kit 에 `saveFile(base64, fileName, mimeType)` 를 추가**하고(기존 함수는 그대로 두므로 다른 앱 수정 없음) 이 앱은 그것으로 CSV 를 저장한다.

동작
1. 전 기간·전 근무지 기록을 날짜순으로. 헤더: `날짜,근무지,출근,퇴근,휴게(분),실근무(분),야간(분),연장(분),휴일,기본급,가산,추가수당,일급,메모`. 값은 원 단위 정수, 시각 `HH:MM`, 휴일 `Y/N`, 메모는 따옴표 이스케이프.
2. UTF-8 **BOM** 포함(엑셀 한글). `fileName = 근무수첩_{YYYYMMDD}.csv`, `mimeType = 'text/csv'`.
3. `File.saveBase64.isSupported()` false 또는 저장 실패 → 클립보드 폴백을 **두 단계**로: SDK `setClipboardText` → 웹 `navigator.clipboard.writeText`. 둘 다 실패하면 "CSV를 내보내지 못했어요". (브라우저 개발 중에는 SDK 가 없어 두 번째가 받는다 — 첫 검증에서 폴백이 하나뿐이라 브라우저에서 아무 것도 못 했다.)
4. 잠긴 근무지 기록도 **포함**한다(사용자 데이터를 잠그지 않는다).

AC
- [ ] 기록 0건 → 버튼 비활성 + "내보낼 기록이 없어요".
- [ ] 메모에 쉼표·따옴표·줄바꿈이 있어도 CSV 파서(테스트용 간단 파서)로 원복.
- [ ] 실기기 QR: 파일 앱에서 열리고 엑셀·시트에서 한글이 깨지지 않는다.

### 3-14. 설정 시트 (M03, UI-6)
근무지 목록(`● 이름` / `{소득 유형} · 시급 {n}원 · 매월 {d}일`, 탭 → M02) + [추가] / 내 데이터: [CSV 로 기록 내보내기] [전체 삭제 → M05 2단계] + 구판 각주 / 계산 기준 박스(구판 문구, 연도·시행일은 데이터에서) / 출처 링크 / 고객문의 / 같은 개발자 앱(`intoss://net-pay/`, `intoss://rent-calc/`) / 버전.

### 3-15. 저장소 스키마 (US-1) — `createStore('wj')`
| 키 | 타입 | 상한 | 비고 |
|---|---|---|---|
| `wj.profile` | { anonKey, schema, createdAt } | 1KB | |
| `wj.workplaces` | Workplace[] | 8KB | |
| `wj.records.YYYY-MM` | WorkRecord[] | 32KB/월 | 월별 키 분할. 기록 1건 ≈ 150B → 월 200건 여유 |
| `wj.unlock` | Unlock | 1KB | |
| `wj.settings` | { cardHideMoney, lastWorkplaceId, lastBreakMin } | 1KB | |
| `wj.months` | string[] | 2KB | 기록이 있는 월 목록(CSV·삭제용 인덱스) |

전체 삭제 = `wj.months` 의 월 키 전부 + 나머지 키 제거. 마이그레이션은 `profile.schema` 순차.

### 3-16. 문구 규칙·린트 (원칙 A·B) — kit `lint-copy` + `scripts/copy-rules.ts`
금지어
- **A(금융)**: `대출|선지급|가불|카드 ?추천|보험 ?상품|보험 ?가입|적금|투자`
- **B(판정·권고)**: `체불|위반|미달|불법|신고하|고발|노동청에|받아야 ?(해|합니다)|청구하세요|손해|이득|확실`
- 화이트리스트: `건강보험|고용보험|장기요양보험|국민연금|산재보험|4대보험`, "최저임금은 시간당" (수치 안내 각주).

### 3-17. 이벤트 로그
| 이벤트 | 속성 |
|---|---|
| `app_open` | workplaces(0/1/2+), unlocked |
| `record_saved` | isEdit, overnight(bool), holiday(bool), fivePlus(bool) |
| `record_deleted` | — |
| `workplace_saved` | incomeType, fivePlus, isEdit |
| `month_view` | offset(0/−1/−2/older) |
| `gate_view` / `ad_reward_earned` | feature |
| `share_card_created` | hideMoney, via |
| `csv_exported` | rowsBucket(1-10/11-50/51+), via(file/clipboard) |
| `data_cleared` | — |
금액·근무지명·시각은 넣지 않는다.

---

## 4. 빌드·데이터 파이프라인 (DT-1~4)
```
src/data/legal.json        (수동 편집, 행마다 출처·확인일)
src/data/rates.json        (net-pay 복사)
src/data/tax-tables.json   (net-pay 복사)
   │ npm run check:data → scripts/check-data.ts
   ▼ (a) minWage 올해 행 (b) rates 현재 행 (c) 세액표 시행일 ≤ 오늘 (d) checkedAt 1년 경고·2년 실패 (e) 골든 테스트
npm run build         = check(typecheck + lint:copy + test) + check:data + check:config + vite build + check:bundle + ait build
npm run build:release = 같은 흐름에 --release (테스트 광고 ID·진단 문구 잔존 시 실패)
```
갱신: 1월(최저임금·요율·상하한), 3월경(세액표), 7월(국민연금 상하한). net-pay 가 갱신하면 복사 + `check:data` + 재심사.

## 5. 비기능 요구사항
| 항목 | 기준 |
|---|---|
| 오프라인 | 기록·계산·CSV·카드 전부 오프라인. 광고만 온라인 |
| 성능 | 첫 렌더 1s, 미리보기 갱신 16ms 이내, 월 집계(기록 200건) 5ms 이내 |
| 테마·제스처·사운드 | 라이트 고정, 핀치 확대 비활성, 사운드 없음 |
| 접근성 | 시간·금액 입력 라벨·단위, 달력 점에 텍스트 대체, 버튼 44pt |
| 권한 | 없음(파일 저장은 SDK 경유) |
| 개인정보 | 서버 0, 로그에 금액·이름·시각 없음, 전체 삭제 |

## 6. 테스트 매트릭스
| 계층 | 대상 | 도구 |
|---|---|---|
| 단위 | splitShift(자정·야간·휴게·휴일), dayPay(5인 이상/미만), weeklyHoliday(경계 14.5/15/16/40/48h, settled, 월 귀속), monthSummary(잠김 제외), deductions(3 유형·토글·신고 보수), CSV 직렬화·역파싱, 게이트 만료 | Vitest |
| 골든 | **20+ 건** 시간→급여를 근로기준법 원문 산술로 + 구판 화면 82,560·165,120 재현 + net-pay 공제 골든 재사용 | Vitest + FACT_CHECK.md |
| 데이터 | legal.json 무결성·확인일, rates/tax-tables 가 net-pay 와 byte 동일 | 스크립트 |
| 문구 | 금지어 린트, 카드 숨김 규칙 | 스크립트 + Vitest |
| 컴포넌트 | 홈 카드 A 큰 숫자 존재, 면책·계산 기준 문구, 5인 미만 각주 | Testing Library |
| 플랫폼 | 비게임 체크리스트, QR(자정 넘김·야간·휴일·CSV 파일 열기·광고·백버튼·딥링크) | 수동 |

## 7. 오픈 이슈
| ID | 내용 | 해결 시점 |
|---|---|---|
| ~~O-1~~ | ~~CSV 경로~~ → `File.saveBase64` + `text/csv`. kit 에 `saveFile` 추가(3-13) | 해결 2026-09-09 |
| ~~O-2~~ | ~~일용근로 소액부징수·사업소득 3.3% 조문~~ → 2026-09-09 원문 확인 완료(소득세법 제47조 제2항·제59조 제3항·제86조 제1호·제129조). 시행령 제149조의3 만 2차 출처 — `legal.json` needsVerification 에 남겼다 | 해결 |
| O-3 | 주 40시간 초과 연장(근무지별 주 단위) `[P1]` — 1일 8h 초과와 중복 제거 규칙 | 출시 후 |
| O-4 | kit `saveCardImage` 가 deprecated `saveBase64Data` 를 쓴다. `File.saveBase64` 로 바꾸는 것은 세 앱에 영향 → **사용자에게 보고**, 각 세션이 처리 | 보고 |
| O-5 | 급여일 기준 기간 `[P1]` | 출시 후 |

## 8. 변경 이력
- 2026-09-09 v0.1 초안. PRD v0.1, 구판 화면 11장 기준. 공제는 net-pay 엔진, 주휴는 기록 기반·주 확정 규칙, CSV 는 `File.saveBase64`.
