/** 요율 조회 — docs/FUNCTIONAL_SPEC.md §1-2, §1-3 */
import type { RateRow, RatesFile } from '@/types';

/** from <= date 인 마지막 행. 데이터가 date보다 뒤면 첫 행을 쓴다 */
export function rateFor(rates: RatesFile, date: string): RateRow {
  let found: RateRow | undefined;
  for (const row of rates) {
    if (row.from <= date) found = row;
    else break;
  }
  const first = rates[0];
  if (!found && !first) throw new Error('rates.json 이 비어 있습니다');
  return (found ?? first) as RateRow;
}

/** 연도 Y의 요율 = 그 해 하반기(12-31 기준) 시행값 */
export function rateForYear(rates: RatesFile, year: number): RateRow {
  return rateFor(rates, `${year}-12-31`);
}

/** rates 배열이 from 오름차순인지 */
export function isSortedByFrom(rates: RatesFile): boolean {
  for (let i = 1; i < rates.length; i++) {
    const prev = rates[i - 1];
    const cur = rates[i];
    if (!prev || !cur) return false;
    if (prev.from >= cur.from) return false;
  }
  return true;
}
