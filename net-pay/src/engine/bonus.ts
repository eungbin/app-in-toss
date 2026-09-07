/**
 * 상여 분리 — docs/FUNCTIONAL_SPEC.md §4-5 (US-5)
 *
 * 연봉에 상여가 포함돼 있으면 매달 받는 돈이 연봉÷12가 아니다.
 * 상여 없는 달과 상여 달의 실수령을 따로 계산한다.
 *
 * 소득세 — 소득세법 제136조 제1항 제1호 (지급대상기간이 있는 상여등)
 *   세액 = 간이세액(상여÷지급대상기간 월수 + 그 기간의 상여 외 월평균 급여) × 지급대상기간 월수
 *          − 그 기간에 이미 원천징수한 세액
 *   같은 조 제3호: 지급대상기간이 1년을 넘으면 1년으로 보고, 1개월 미만의 끝수는 1개월로 본다.
 *
 * 4대보험 — 상여 달에도 국민연금·건강보험·장기요양은 그대로다.
 *   기준소득월액과 보수월액은 **상여를 포함한 연간 보수를 근무월수로 나눈 값**으로 정해져
 *   1년간 매월 같게 부과된다. 고용보험만 그 달에 실제 지급한 보수에 부과한다.
 *
 * 회사 급여 시스템의 처리와 다를 수 있다. 화면에 그 안내를 함께 둔다.
 */
import type { CalcOptions } from '@/types';
import { rateFor } from './rates';
import { lookupIncomeTax } from './tax';
import { taxTableFor } from '@/data';
import { type EngineData, BUNDLED } from './net';
import { clamp, floor10, floor1, truncTo } from './money';

export interface BonusPlan {
  /** 연 상여 횟수. 0이면 상여 없음 */
  count: number;
  /** 연 상여 총액 (원). 연봉에 포함된 금액이다 */
  annualTotal: number;
}

export interface MonthPay {
  /** 그 달 세전 지급액 */
  gross: number;
  nps: number;
  nhis: number;
  ltc: number;
  ei: number;
  incomeTax: number;
  localTax: number;
  deductions: number;
  net: number;
}

export interface BonusSplitResult {
  /** 기본급 월액 (세전) */
  baseMonthly: number;
  /** 상여 1회당 금액 */
  bonusEach: number;
  /** 지급대상기간 월수 */
  periodMonths: number;
  bonusMonths: number;
  plainMonths: number;
  plain: MonthPay;
  bonus: MonthPay;
  /** 12개월 실수령 합계 */
  annualNet: number;
}

const LOCAL_TAX_RATE = 0.1;
const NPS_BASE_UNIT = 1_000;

/** 상여 계획이 유효한가 */
export function hasBonus(plan: BonusPlan): boolean {
  return plan.count > 0 && plan.annualTotal > 0;
}

/**
 * 연봉과 상여 계획으로 상여 없는 달·상여 달의 실수령을 계산한다.
 * 상여 총액은 연봉에 포함된 금액으로 본다.
 */
export function computeBonusSplit(
  annualGross: number,
  plan: BonusPlan,
  opts: CalcOptions,
  data: EngineData = BUNDLED,
): BonusSplitResult {
  const gross = Math.max(0, Math.floor(annualGross));
  const count = clamp(Math.round(plan.count), 1, 12);
  const annualBonus = clamp(Math.floor(plan.annualTotal), 0, gross);
  const bonusEach = Math.floor(annualBonus / count);
  const baseMonthly = Math.floor((gross - annualBonus) / 12);

  // 지급대상기간: 1개월 미만의 끝수는 1개월로 (법 제136조 제1항 제3호)
  const periodMonths = clamp(Math.ceil(12 / count), 1, 12);

  const rate = rateFor(data.rates, opts.asOf);
  const table = taxTableFor(opts.asOf, data.tables).table;
  const nonTax = Math.max(0, opts.nonTaxableMonthly);

  /** 4대보험 중 국민연금·건강보험·장기요양은 연봉 기준으로 매월 같다 */
  const uniformTaxable = Math.max(0, Math.floor(gross / 12) - nonTax);
  const npsBase = clamp(truncTo(uniformTaxable, NPS_BASE_UNIT), rate.nps.baseMin, rate.nps.baseMax);
  const nps = uniformTaxable === 0 ? 0 : floor1(npsBase * rate.nps.totalRate * rate.nps.employeeShare);
  const premium = clamp(
    uniformTaxable * rate.nhis.totalRate,
    rate.nhis.premiumMin ?? 0,
    rate.nhis.premiumMax ?? Number.POSITIVE_INFINITY,
  );
  const nhis = uniformTaxable === 0 ? 0 : floor10(premium * rate.nhis.employeeShare);
  const ltc = floor10(nhis * rate.nhis.ltcRateOnPremium);

  /** 고용보험은 그 달 실제 지급액 기준 */
  const eiOf = (monthGross: number) => {
    const taxable = Math.max(0, monthGross - nonTax);
    return taxable === 0 ? 0 : floor10(taxable * rate.ei.totalRate * rate.ei.employeeShare);
  };

  const baseTaxable = Math.max(0, baseMonthly - nonTax);
  const plainTaxRaw = lookupIncomeTax(table, baseTaxable, opts.dependents, opts.children);
  const plainTax = floor10(plainTaxRaw * opts.taxRatio);

  // 상여 달: 간이세액(월평균) × 지급대상기간 − 그 기간에 이미 낸 세액
  const avgTaxable = baseTaxable + bonusEach / periodMonths;
  const avgTaxRaw = lookupIncomeTax(table, avgTaxable, opts.dependents, opts.children);
  const bonusMonthTax = Math.max(
    0,
    floor10(avgTaxRaw * opts.taxRatio * periodMonths - plainTax * (periodMonths - 1)),
  );

  const pack = (monthGross: number, incomeTax: number): MonthPay => {
    const localTax = floor10(incomeTax * LOCAL_TAX_RATE);
    const ei = eiOf(monthGross);
    const deductions = nps + nhis + ltc + ei + incomeTax + localTax;
    return { gross: monthGross, nps, nhis, ltc, ei, incomeTax, localTax, deductions, net: monthGross - deductions };
  };

  const plain = pack(baseMonthly, plainTax);
  const bonus = pack(baseMonthly + bonusEach, bonusMonthTax);
  const plainMonths = 12 - count;

  return {
    baseMonthly,
    bonusEach,
    periodMonths,
    bonusMonths: count,
    plainMonths,
    plain,
    bonus,
    annualNet: plain.net * plainMonths + bonus.net * count,
  };
}
