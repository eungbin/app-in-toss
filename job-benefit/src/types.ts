/** 데이터 모델 — docs/FUNCTIONAL_SPEC.md §1 */

export interface Source {
  label: string;
  url: string;
  checkedAt: string;
}

/** 이직 사유 3갈래 */
export type QuitReason = 'involuntary' | 'voluntary' | 'voluntaryJustified';

/** 피보험기간 구간 — 고용보험법 별표 1의 5구간 */
export type InsuredBand = 'lt1' | 'y1to3' | 'y3to5' | 'y5to10' | 'gte10';

/** 소정근로시간을 정한 단위 — 시행규칙 제91조의2 */
export type StdHoursBasis =
  | { kind: 'day'; hours: number }
  | { kind: 'week'; hours: number; paidHolidayHours: number }
  | { kind: 'month'; hours: number; paidHolidayHours: number }
  | { kind: 'varies4w'; hours4w: number; paidHolidayHours4w: number };

export interface Input {
  reason: QuitReason;
  /** 별표 2 항목 id. reason === 'voluntaryJustified' 일 때만 */
  justifiedItem?: string;
  /** 이직일 현재 만 나이 */
  ageAtQuit: number;
  /** 장애인고용촉진법 제2조1호 장애인 — 별표 1 비고로 50세 이상으로 본다 */
  disabled: boolean;
  /** 입사일 (ISO) */
  hiredDate: string;
  /** 이직일 (ISO) */
  quitDate: string;
  stdHours: StdHoursBasis;
  /** 최근 3개월 임금 총액(원) */
  wageTotal3m: number;
  /** 1일 통상임금(원). 모르면 생략 — 법 제45조② 보정용 */
  ordinaryDaily?: number;
}

export type Verdict = 'likely' | 'check' | 'unlikely';

/** 기초일액에 걸린 조정 — 화면 설명 문구를 고르는 근거 */
export type Applied = 'ordinary' | 'cap' | 'minBase' | 'minDaily';

export interface Breakdown {
  verdict: Verdict;
  reasons: string[];
  insuredBand: InsuredBand;
  insuredDaysEstimated: number;
  treatedAs50plus: boolean;
  periodDays: number;
  averageDaily: number;
  stdDayHours: number;
  minBaseDaily: number;
  baseDaily: number;
  applied: Applied[];
  /** 화면에 쓰는 일액 — 원 단위로 버린 값 */
  benefitDaily: number;
  /** 버리기 전 일액. total 은 이 값으로 곱한다 */
  benefitDailyExact: number;
  benefitDays: number;
  total: number;
}

export interface EarlyBonus {
  eligible: boolean;
  remainingDays: number;
  amount: number;
  blockedBy?: 'within14days' | 'remainLessThanHalf';
}

export interface CurvePoint {
  day: number;
  paid: number;
  bonus: number;
  total: number;
}

/* ── 번들 데이터 ───────────────────────────────────────────── */

/** src/data/benefit-days.json — 별표 1 */
export interface BenefitDaysFile {
  meta: { source: string; url: string; amendedOn: string; fetchedAt: string; license: string };
  /** [1년 미만, 1~3년, 3~5년, 5~10년, 10년 이상] */
  under50: [number, number, number, number, number];
  from50: [number, number, number, number, number];
  note: string;
}

/** src/data/quit-reasons.json — 시행규칙 별표 2 */
export interface QuitReasonsFile {
  meta: { source: string; url: string; amendedOn: string; fetchedAt: string; license: string };
  items: Array<{ id: string; text: string; sub?: string[] }>;
}

/** src/data/legal.json — 조문 상수. 각 값에 조문과 출처를 붙인다 */
export interface LegalFile {
  basePeriodMonths: number;
  insuredDaysMin: number;
  waitingDays: number;
  rateNormal: number;
  rateMin: number;
  baseDailyCap: number;
  early: { afterDays: number; remainRatio: number; employMonths: number; rate: number };
  stdHours: { weekDiv: number; monthDiv: number; fourWeekDiv: number; dayHours: number };
  sources: Source[];
  needsVerification?: string[];
  /** 절사 규칙의 근거 — 원문에 없어 공공 계산기 대조로 정했다 */
  roundingNote?: string;
}

/** src/data/min-wage.json */
export interface MinWageFile {
  minWage: Array<{ year: number; hourly: number; source: Source }>;
}
