/** 도메인 타입 — docs/FUNCTIONAL_SPEC.md §1 */

/* ── 요율 (src/data/rates.json) — net-pay 와 같은 스키마·같은 내용 ──── */

/**
 * 보험료는 고시가 "총요율"과 "총 보험료 상·하한"으로 정해진다.
 * 근로자 부담은 employeeShare(연금·건보 0.5, 고용보험 1)를 곱해 구한다.
 */
export interface RateRow {
  /** 시행일 "YYYY-MM-DD" */
  from: string;
  nps: { totalRate: number; employeeShare: number; baseMin: number; baseMax: number };
  nhis: {
    totalRate: number;
    employeeShare: number;
    ltcRateOnPremium: number;
    premiumMin: number | null;
    premiumMax: number | null;
  };
  ei: { totalRate: number; employeeShare: number };
  sources: SourceRef[];
  needsVerification?: string[];
}

export interface SourceRef {
  label: string;
  url: string;
  checkedAt: string;
}

export type RatesFile = RateRow[];

/* ── 간이세액표 (src/data/tax-tables.json) ──────────────────────────── */

export interface TaxBracket {
  lo: number;
  hi: number;
  /** 공제대상가족 1~11명의 월 세액 */
  tax: number[];
}

export interface OverCapSegment {
  from: number;
  to: number | null;
  add: number;
  factor: number;
  rate: number;
}

export interface TaxTableFile {
  meta: {
    source: string;
    effectiveFrom: string;
    fetchedAt: string;
    url: string;
    license: string;
    amendedOn?: string;
    dev?: true;
  };
  brackets: TaxBracket[];
  childDeduction: { one: number; two: number; extraPerChild: number };
  overCap: { verified: boolean; baseTax: number[]; segments: OverCapSegment[] };
}

/* ── 공제 계산 입출력 (net-pay computeNet 과 동일) ──────────────────── */

export interface CalcOptions {
  /** 공제대상 가족 수(본인 포함) 1~11 */
  dependents: number;
  /** 8세 이상 20세 이하 자녀 수 0~10 */
  children: number;
  /** 비과세 월액 (원) */
  nonTaxableMonthly: number;
  taxRatio: 0.8 | 1 | 1.2;
  /** 적용 기준일 "YYYY-MM-DD" */
  asOf: string;
}

export interface Breakdown {
  asOf: string;
  taxTableEffectiveFrom: string;
  taxTableFallback: boolean;
  annualGross: number;
  grossMonthly: number;
  taxableMonthly: number;
  nps: number;
  nhis: number;
  ltc: number;
  ei: number;
  incomeTax: number;
  localTax: number;
  deductions: number;
  netMonthly: number;
  netAnnual: number;
  capped: { nps: 'min' | 'max' | null; nhis: 'min' | 'max' | null };
}

/* ── 법정 상수 (src/data/legal.json) ────────────────────────────────── */

export interface LegalFile {
  /** 연도별 최저임금 시급 */
  minWage: { year: number; hourly: number; source: SourceRef }[];
  /** 야간근로 구간 — 자정 기준 분 (22:00 = 1320, 06:00 = 360) */
  night: { startMin: number; endMin: number };
  /** 가산율 (5인 이상 사업장) */
  rates: { overtime: number; night: number; holidayIn8: number; holidayOver8: number };
  /** 1일 법정 근로시간(분) — 초과분이 연장 */
  dailyStdMinutes: number;
  weeklyHoliday: { minHours: number; capMinutes: number; stdWeekMinutes: number };
  /** 일용근로 원천징수 — 1일 공제액·세율·근로소득세액공제율 */
  dailyLabor: { deduct: number; taxRate: number; creditRate: number };
  /** 원천징수대상 사업소득 — 세율과 소액부징수 적용 여부 */
  business: { taxRate: number; smallAmountExempt: boolean };
  /** 소액부징수 기준 (원). 원천징수세액이 이 값 미만이면 징수하지 않는다 */
  smallTaxFloor: number;
  sources: SourceRef[];
  /** 원문 대조가 끝나지 않은 항목. 프로덕션 빌드가 차단된다 */
  needsVerification?: string[];
}

/* ── 앱 도메인 ──────────────────────────────────────────────────────── */

/** 일반 근로 / 일용 근로 / 사업소득 */
export type IncomeType = 'employee' | 'daily' | 'business';
export type WorkplaceColor = 'purple' | 'blue' | 'green' | 'orange' | 'red';

export interface Workplace {
  id: string;
  name: string;
  /** 시급 (원) */
  hourlyWage: number;
  /** 상시 5명 이상 사업장 — 근로기준법 제11조·시행령 별표 1 */
  fivePlus: boolean;
  /** 급여일 1~31. 표시용 */
  payday: number;
  incomeType: IncomeType;
  weeklyHolidayAuto: boolean;
  /** 아래 6개는 incomeType === 'employee' 일 때만 쓴다 */
  dependents: number;
  children: number;
  nonTaxableMonthly: number;
  taxRatio: 0.8 | 1 | 1.2;
  insurance: { nps: boolean; nhis: boolean; ei: boolean };
  /** 월 보험 신고 보수. 0 이면 예상 세전 급여를 쓴다 */
  reportedMonthly: number;
  color: WorkplaceColor;
  createdAt: string;
}

export interface WorkRecord {
  id: string;
  workplaceId: string;
  /** 출근 날짜 "YYYY-MM-DD" — 월 귀속 기준 */
  date: string;
  /** 자정 기준 분. end < start 면 다음 날 퇴근. 같으면 입력 오류 */
  start: number;
  end: number;
  breakMin: number;
  extraPay: number;
  holiday: boolean;
  memo: string;
}

/** 실근무를 야간·연장·휴일로 나눈 것 (분) */
export interface ShiftSplit {
  /** 퇴근 − 출근 (휴게 포함) */
  span: number;
  /** 실근무 = span − 휴게 */
  work: number;
  night: number;
  overtime: number;
  holidayIn8: number;
  holidayOver8: number;
}

export interface DayPay {
  base: number;
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  extra: number;
  total: number;
}

export interface WeeklyHoliday {
  /** 그 주 월요일 "YYYY-MM-DD" */
  weekStart: string;
  workplaceId: string;
  workMin: number;
  eligible: boolean;
  holidayMin: number;
  pay: number;
  /** 그 주 일요일이 오늘 이전이면 확정 */
  settled: boolean;
}

export interface MonthDeductions {
  incomeTax: number;
  localTax: number;
  nps: number;
  nhis: number;
  ltc: number;
  ei: number;
  total: number;
}

export interface WorkplaceMonth {
  workplaceId: string;
  workMin: number;
  /** 기록이 있는 고유 날짜 수 */
  days: number;
  /** Σ 기본급 + 추가수당 (가산 제외) */
  workPay: number;
  /** Σ 연장·야간·휴일 가산 */
  addedPay: number;
  extraPay: number;
  weeklyHolidayCount: number;
  weeklyHolidayPay: number;
  /** 아직 확정되지 않은 이번 주 주휴 */
  pendingWeeklyHoliday: WeeklyHoliday | null;
  gross: number;
  deductions: MonthDeductions;
  net: number;
}

export interface MonthSummary {
  /** "YYYY-MM" */
  month: string;
  workMin: number;
  days: number;
  workPay: number;
  addedPay: number;
  weeklyHolidayCount: number;
  weeklyHolidayPay: number;
  pendingWeeklyHolidayPay: number;
  gross: number;
  deductions: number;
  net: number;
  byWorkplace: WorkplaceMonth[];
  /** 게이트로 합계에서 빠진 근무지 */
  lockedWorkplaceIds: string[];
}

export interface Unlock {
  /** epoch ms. 기기 로컬 다음 자정 */
  until: number | null;
}

export interface Settings {
  cardHideMoney: boolean;
  lastWorkplaceId: string | null;
  lastBreakMin: number;
}
