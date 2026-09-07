/** 시간축 — docs/FUNCTIONAL_SPEC.md §3-5 (CE-7). 공유 카드의 소재 */
import type { CalcOptions, TimelineResult, TimelineRow } from '@/types';
import { TIMELINE_FROM_YEAR } from '@/constants';
import { rateForYear } from './rates';
import { computeNet, type EngineData, BUNDLED } from './net';

/** 시간축에 쓸 연도 목록 (기준 연도 포함) */
export function timelineYears(asOf: string, fromYear = TIMELINE_FROM_YEAR): number[] {
  const current = Number(asOf.slice(0, 4));
  const years: number[] = [];
  for (let y = fromYear; y <= current; y++) years.push(y);
  return years;
}

/**
 * 같은 세전 연봉을 연도별 요율·세액표로 계산한다.
 * 각 연도는 그 해 하반기(12-31) 시행값을 쓴다.
 */
export function computeTimeline(
  annualGross: number,
  opts: CalcOptions,
  data: EngineData = BUNDLED,
): TimelineResult {
  const years = timelineYears(opts.asOf);
  const rows: TimelineRow[] = years.map((year) => {
    const breakdown = computeNet(annualGross, { ...opts, asOf: `${year}-12-31` }, data);
    const r = rateForYear(data.rates, year);
    return {
      year,
      netMonthly: breakdown.netMonthly,
      deductions: breakdown.deductions,
      breakdown,
      rates: {
        npsTotal: r.nps.totalRate,
        nhisTotal: r.nhis.totalRate,
        ltcOnPremium: r.nhis.ltcRateOnPremium,
      },
    };
  });

  const first = rows[0];
  const last = rows[rows.length - 1];
  return {
    rows,
    deltaDeductions: first && last ? last.deductions - first.deductions : 0,
    baseYear: first?.year ?? years[0] ?? 0,
    fallbackYears: rows.filter((r) => r.breakdown.taxTableFallback).map((r) => r.year),
  };
}
