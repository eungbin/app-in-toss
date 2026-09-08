/**
 * 시간축 — docs/FUNCTIONAL_SPEC.md §3-7
 *
 * 같은 보증금을 전부 월세로 돌릴 때의 법정 상한이 기준금리 변동에 따라
 * 연도별로 어떻게 달랐는지 보여 준다.
 * 5% 증액 상한은 연도와 무관하므로 시간축은 전환율만 다룬다.
 */
import { TIMELINE_FROM_YEAR } from '@/constants';
import type { BaseRateFile, TimelineRow } from '@/types';
import { rateAt } from './baserate';
import { depositToRent, legalConversionRate } from './rate';

export function timeline(
  deposit: number,
  data: BaseRateFile,
  now: Date = new Date(),
): TimelineRow[] {
  const rows: TimelineRow[] = [];
  const thisYear = now.getFullYear();

  for (let year = TIMELINE_FROM_YEAR; year <= thisYear; year++) {
    const date = `${year}-01-01`;
    const baseRate = rateAt(data, date);
    const legalRate = legalConversionRate(baseRate);
    rows.push({
      label: String(year),
      date,
      baseRate,
      legalRate,
      maxRent: depositToRent(deposit, legalRate),
    });
  }

  // 최신값. 연초 값과 같은 날짜면 중복이라 넣지 않는다.
  const asOf = data.meta.asOf;
  const last = rows[rows.length - 1];
  if (last !== undefined && last.date !== asOf) {
    const baseRate = rateAt(data, asOf);
    const legalRate = legalConversionRate(baseRate);
    rows.push({ label: '최신', date: asOf, baseRate, legalRate, maxRent: depositToRent(deposit, legalRate) });
  }

  return rows;
}
