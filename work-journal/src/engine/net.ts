/** 정방향 계산 — docs/FUNCTIONAL_SPEC.md §3-2 (CE-1 ~ CE-5) */
import type { Breakdown, CalcOptions, RatesFile, TaxTableFile } from '@/types';
import { RATES, TAX_TABLES, taxTableFor } from '@/data';
import { rateFor } from './rates';
import { lookupIncomeTax } from './tax';
import { clamp, floor1, floor10, truncTo } from './money';

export interface EngineData {
  rates: RatesFile;
  tables: TaxTableFile[];
}

export const BUNDLED: EngineData = { rates: RATES, tables: TAX_TABLES };

/** 지방소득세율 — 소득세의 10% */
const LOCAL_TAX_RATE = 0.1;
/** 국민연금 기준소득월액은 천 원 단위로 절사한다 */
const NPS_BASE_UNIT = 1_000;

/**
 * 연봉과 옵션으로 월 공제·실수령을 계산한다.
 *
 * 절사 규칙(국민연금 원 단위, 나머지 10원 단위)은 공단 규정 추정치이며
 * 골든 테스트(docs/FACT_CHECK.md)로 확정한다 — 기능 명세 오픈 이슈 O-2.
 */
export function computeNet(
  annualGross: number,
  opts: CalcOptions,
  data: EngineData = BUNDLED,
): Breakdown {
  const gross = Math.max(0, Math.floor(annualGross));
  const grossMonthly = Math.floor(gross / 12);
  const taxableMonthly = Math.max(0, grossMonthly - Math.max(0, opts.nonTaxableMonthly));

  const rate = rateFor(data.rates, opts.asOf);
  const pick = taxTableFor(opts.asOf, data.tables);

  // 국민연금 — 기준소득월액에 상·하한을 적용한 뒤 근로자 부담분
  const rawBase = truncTo(taxableMonthly, NPS_BASE_UNIT);
  const npsBase = clamp(rawBase, rate.nps.baseMin, rate.nps.baseMax);
  const npsCapped: 'min' | 'max' | null =
    taxableMonthly === 0 ? null : rawBase < rate.nps.baseMin ? 'min' : rawBase > rate.nps.baseMax ? 'max' : null;
  const nps = taxableMonthly === 0 ? 0 : floor1(npsBase * rate.nps.totalRate * rate.nps.employeeShare);

  // 건강보험 — 보수월액보험료(총액)에 상·하한을 적용한 뒤 근로자 부담분
  const rawPremium = taxableMonthly * rate.nhis.totalRate;
  const minP = rate.nhis.premiumMin;
  const maxP = rate.nhis.premiumMax;
  const premium = clamp(rawPremium, minP ?? 0, maxP ?? Number.POSITIVE_INFINITY);
  const nhisCapped: 'min' | 'max' | null =
    taxableMonthly === 0
      ? null
      : minP !== null && rawPremium < minP
        ? 'min'
        : maxP !== null && rawPremium > maxP
          ? 'max'
          : null;
  const nhis = taxableMonthly === 0 ? 0 : floor10(premium * rate.nhis.employeeShare);

  // 장기요양 — 근로자가 부담한 건강보험료 기준
  const ltc = floor10(nhis * rate.nhis.ltcRateOnPremium);

  // 고용보험(실업급여) — 근로자 부담분
  const ei = taxableMonthly === 0 ? 0 : floor10(taxableMonthly * rate.ei.totalRate * rate.ei.employeeShare);

  // 소득세·지방소득세
  const rawTax = lookupIncomeTax(pick.table, taxableMonthly, opts.dependents, opts.children);
  const incomeTax = floor10(rawTax * opts.taxRatio);
  const localTax = floor10(incomeTax * LOCAL_TAX_RATE);

  const deductions = nps + nhis + ltc + ei + incomeTax + localTax;
  const netMonthly = grossMonthly - deductions;

  return {
    asOf: opts.asOf,
    taxTableEffectiveFrom: pick.table.meta.effectiveFrom,
    taxTableFallback: pick.fallback,
    annualGross: gross,
    grossMonthly,
    taxableMonthly,
    nps,
    nhis,
    ltc,
    ei,
    incomeTax,
    localTax,
    deductions,
    netMonthly,
    netAnnual: netMonthly * 12,
    capped: { nps: npsCapped, nhis: nhisCapped },
  };
}

/** 월 실수령만 필요할 때 (역산 내부 루프용) */
export function netMonthlyOf(annualGross: number, opts: CalcOptions, data: EngineData = BUNDLED): number {
  return computeNet(annualGross, opts, data).netMonthly;
}
