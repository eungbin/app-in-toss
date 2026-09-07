/** 도메인 타입 — docs/FUNCTIONAL_SPEC.md §1 */
import type { AnonProfile } from '@ait/kit';

/* ── 요율 (src/data/rates.json) ────────────────────────────── */

/**
 * 보험료는 고시가 "총요율"과 "총 보험료 상·하한"으로 정해진다.
 * 근로자 부담은 employeeShare(연금·건보 0.5, 고용보험 1)를 곱해 구한다.
 * 이렇게 두면 "상한이 총액인지 본인 부담인지" 같은 해석 오류가 생기지 않는다.
 */
export interface RateRow {
  /** 시행일 "YYYY-MM-DD" */
  from: string;
  nps: {
    totalRate: number;
    employeeShare: number;
    /** 기준소득월액 하한·상한 (원) */
    baseMin: number;
    baseMax: number;
  };
  nhis: {
    totalRate: number;
    employeeShare: number;
    /** 장기요양보험료율 — 건강보험료 대비 */
    ltcRateOnPremium: number;
    /** 보수월액보험료(총액) 하한·상한 (원). null이면 적용 안 함 */
    premiumMin: number | null;
    premiumMax: number | null;
  };
  ei: {
    /** 실업급여 근로자 부담 요율 */
    totalRate: number;
    employeeShare: number;
  };
  sources: SourceRef[];
  /** 원문 대조가 끝나지 않은 값이 있는 행. 프로덕션 빌드가 차단된다 */
  needsVerification?: string[];
}

export interface SourceRef {
  label: string;
  url: string;
  checkedAt: string;
}

export type RatesFile = RateRow[];

/* ── 간이세액표 (src/data/tax-table/*.json) ────────────────── */

export interface TaxBracket {
  /** 월 과세급여 하한(이상) */
  lo: number;
  /** 월 과세급여 상한(미만) */
  hi: number;
  /** 공제대상가족 1~11명의 월 세액 */
  tax: number[];
}

/**
 * 월 과세급여가 표 상한을 넘을 때의 산식 (별표2 원문).
 * 세액 = baseTax[가족수] + add + (과세급여 − from) × factor × rate
 *
 * 구간은 **누적하지 않는다.** 각 구간의 식이 그 자체로 완결된다.
 * factor 0.98은 원문의 "초과하는 금액에 98%를 곱한 금액의 N% 상당액"에서 온다.
 */
export interface OverCapSegment {
  /** 초과(exclusive) */
  from: number;
  /** 이하(inclusive). null이면 상한 없음 */
  to: number | null;
  add: number;
  factor: number;
  rate: number;
}

export interface TaxTableFile {
  meta: {
    source: string;
    /** 시행일 "YYYY-MM-DD" */
    effectiveFrom: string;
    fetchedAt: string;
    url: string;
    license: string;
    /** 원문 개정일. 시행일(effectiveFrom)과 다르다 */
    amendedOn?: string;
    /** 손으로 만든 표. true면 프로덕션 빌드가 차단된다 */
    dev?: true;
  };
  brackets: TaxBracket[];
  /** 8세 이상 20세 이하 자녀 수별 차감액 (비고 3) */
  childDeduction: { one: number; two: number; extraPerChild: number };
  overCap: {
    /** 원문에서 읽어냈는가. false면 프로덕션 빌드가 차단된다 */
    verified: boolean;
    /** 표 상한(마지막 구간의 hi)에서의 세액. 공제대상가족 1~11명 */
    baseTax: number[];
    segments: OverCapSegment[];
  };
}

/* ── 계산 입출력 ──────────────────────────────────────────── */

export type CalcMode = 'reverse' | 'forward';

export interface CalcOptions {
  /** 공제대상 가족 수(본인 포함) 1~11 */
  dependents: number;
  /** 8세 이상 20세 이하 자녀 수 0~10 */
  children: number;
  /** 비과세 월액 (원) */
  nonTaxableMonthly: number;
  /** 간이세액표 선택 비율. v1.0은 항상 1 */
  taxRatio: 0.8 | 1 | 1.2;
  /** 적용 기준일 "YYYY-MM-DD" */
  asOf: string;
}

export interface Breakdown {
  asOf: string;
  taxTableEffectiveFrom: string;
  /** 해당 연도의 세액표가 없어 현행 표로 계산했는가 */
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
  /** 상·하한이 걸린 항목 */
  capped: { nps: 'min' | 'max' | null; nhis: 'min' | 'max' | null };
}

export interface ReverseResult {
  target: number;
  /** 목표 실수령을 만족하는 최소 연봉 (원) */
  annualGross: number;
  /** 만 원 단위로 올린 표시용 연봉 */
  annualGrossDisplay: number;
  achievedNet: number;
  /** 탐색 범위를 넘어 계산하지 못함 */
  outOfRange: boolean;
  breakdown: Breakdown;
}

export interface TimelineRow {
  year: number;
  netMonthly: number;
  deductions: number;
  breakdown: Breakdown;
  rates: { npsTotal: number; nhisTotal: number; ltcOnPremium: number };
}

export interface TimelineResult {
  rows: TimelineRow[];
  /** 현재 연도 공제 − 기준 연도 공제 */
  deltaDeductions: number;
  baseYear: number;
  /** 세액표 폴백이 쓰인 연도 */
  fallbackYears: number[];
}

/* ── 퇴직금·연차수당 ──────────────────────────────────────── */

export interface SeveranceInput {
  joinDate: string;
  lastWorkDate: string;
  wages3m: number;
  annualBonus: number;
  annualLeavePay: number;
  /** 1일 통상임금. 평균임금보다 크면 이 값을 쓴다(근로기준법 제2조 제2항) */
  ordinaryDaily: number | null;
}

export interface SeveranceResult {
  /** 재직일수 (퇴사일 − 입사일) */
  days: number;
  years: number;
  months: number;
  restDays: number;
  /** 평균임금 산정 기간의 일수 */
  period3mDays: number;
  avgDaily: number;
  /** 통상임금이 평균임금을 대체했는가 */
  usedOrdinary: boolean;
  severance: number;
  underOneYear: boolean;
}

export interface LeavePayInput {
  monthlyOrdinary: number;
  monthlyHours: number;
  unusedDays: number;
}

export interface LeavePayResult {
  hourly: number;
  daily: number;
  pay: number;
}

/* ── 저장 ─────────────────────────────────────────────────── */

/** 익명 프로필 — 구조는 @ait/kit AnonProfile. 앱 고유 필드가 생기면 여기서 확장한다 */
export type Profile = AnonProfile;

export interface CalcInput extends CalcOptions {
  mode: CalcMode;
  annualGross?: number;
  targetNet?: number;
}

export interface Scenario {
  id: string;
  name: string;
  input: CalcInput;
  createdAt: string;
}

export interface Unlock {
  until: number | null;
}
