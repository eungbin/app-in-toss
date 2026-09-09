/**
 * 공제 (CE-5) — docs/FUNCTIONAL_SPEC.md §3-6
 *
 * 일반 근로의 세금·4대보험은 net-pay 의 computeNet 을 그대로 쓴다. 그 엔진은 이미 국세청
 * 간이세액표 원문과 공단·복지부 고시로 골든 테스트를 통과했다.
 * **구판 화면의 공제액(세전 165,120원에 27,650원)은 따르지 않는다** — 건강보험 보수월액보험료
 * 하한을 적용하지 않은 값이었다. 자세한 대조는 docs/LEGACY_SCREENS.md 3-1.
 *
 * 일용근로: (일급 − 15만원) × 6% 의 45%(근로소득세액공제 55% 차감분)를 일별로 계산하고
 *           1천원 미만은 징수하지 않는다(소득세법 제86조 제1호).
 * 사업소득: 3% + 지방소득세. 인적용역을 계속·반복 공급한 사업소득은 **소액부징수 예외**라
 *           1천원 미만도 원천징수한다(소득세법 시행령 제149조의3).
 */
import type { LegalFile, MonthDeductions, RatesFile, TaxTableFile, WorkRecord, Workplace } from '@/types';
import { LEGAL, RATES, TAX_TABLES } from '@/data';
import { computeNet } from './net';
import { dayPay } from './pay';
import { splitShift } from './shift';
import { floor10 } from './money';

export interface DeductionData {
  legal: LegalFile;
  rates: RatesFile;
  tables: TaxTableFile[];
}

const BUNDLED: DeductionData = { legal: LEGAL, rates: RATES, tables: TAX_TABLES };

const EMPTY: MonthDeductions = { incomeTax: 0, localTax: 0, nps: 0, nhis: 0, ltc: 0, ei: 0, total: 0 };

function withTotal(d: Omit<MonthDeductions, 'total'>): MonthDeductions {
  return { ...d, total: d.incomeTax + d.localTax + d.nps + d.nhis + d.ltc + d.ei };
}

/** 일반 근로 — 월 세전 급여를 net-pay 엔진에 넣는다 */
function employeeDeductions(
  wp: Workplace,
  grossMonthly: number,
  today: string,
  data: DeductionData,
): MonthDeductions {
  const opts = {
    dependents: wp.dependents,
    children: wp.children,
    nonTaxableMonthly: wp.nonTaxableMonthly,
    taxRatio: wp.taxRatio,
    asOf: today,
  };
  const engine = { rates: data.rates, tables: data.tables };

  // computeNet 은 연봉을 받아 floor(annual/12) 로 월액을 만든다. 월 값을 12배로 넣으면
  // 그 월액이 그대로 복원된다(테스트로 고정).
  const b = computeNet(grossMonthly * 12, opts, engine);

  // 보험 산정 기준을 사용자가 직접 아는 경우(급여명세서의 기준소득월액·보수월액)
  const insuranceBase = wp.reportedMonthly > 0 ? computeNet(wp.reportedMonthly * 12, opts, engine) : b;

  return withTotal({
    incomeTax: b.incomeTax,
    localTax: b.localTax,
    nps: wp.insurance.nps ? insuranceBase.nps : 0,
    nhis: wp.insurance.nhis ? insuranceBase.nhis : 0,
    ltc: wp.insurance.nhis ? insuranceBase.ltc : 0,
    ei: wp.insurance.ei ? insuranceBase.ei : 0,
  });
}

/** 일용근로 — 일별로 계산하고 소액부징수를 적용한다 */
function dailyDeductions(
  wp: Workplace,
  records: WorkRecord[],
  data: DeductionData,
): MonthDeductions {
  const { deduct, taxRate, creditRate } = data.legal.dailyLabor;
  let incomeTax = 0;
  let localTax = 0;

  for (const r of records) {
    const total = dayPay(splitShift(r, data.legal), r, wp, data.legal).total;
    const taxable = Math.max(0, total - deduct);
    // 조문 순서대로 계산한다: 산출세액(제129조 제1항 제4호) → 세액공제(제59조 제3항) → 결정세액.
    // `taxable × 6% × 45%` 로 한 번에 곱하면 1 − 0.55 가 0.44999…가 되어 10원이 어긋난다.
    const calcTax = Math.floor(taxable * taxRate);
    const credit = Math.floor(calcTax * creditRate);
    const withheld = floor10(calcTax - credit);
    if (withheld < data.legal.smallTaxFloor) continue;
    incomeTax += withheld;
    localTax += floor10(withheld * 0.1);
  }
  return withTotal({ ...EMPTY, incomeTax, localTax });
}

/** 사업소득 — 3.3%. 소액부징수 예외라 1천원 미만도 뗀다 */
function businessDeductions(grossMonthly: number, data: DeductionData): MonthDeductions {
  const raw = floor10(grossMonthly * data.legal.business.taxRate);
  const incomeTax = data.legal.business.smallAmountExempt && raw < data.legal.smallTaxFloor ? 0 : raw;
  return withTotal({ ...EMPTY, incomeTax, localTax: floor10(incomeTax * 0.1) });
}

export function monthDeductions(
  wp: Workplace,
  grossMonthly: number,
  records: WorkRecord[],
  today: string,
  data: DeductionData = BUNDLED,
): MonthDeductions {
  if (grossMonthly <= 0 && records.length === 0) return EMPTY;
  switch (wp.incomeType) {
    case 'employee':
      return employeeDeductions(wp, grossMonthly, today, data);
    case 'daily':
      return dailyDeductions(wp, records, data);
    case 'business':
      return businessDeductions(grossMonthly, data);
  }
}
