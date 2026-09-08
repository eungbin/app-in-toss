/** 기준금리 조회 — docs/FUNCTIONAL_SPEC.md §1-1 */
import type { BaseRateFile } from '@/types';

/** date("YYYY-MM-DD") 시점에 유효한 기준금리. 첫 변동 이전이면 첫 값 */
export function rateAt(data: BaseRateFile, date: string): number {
  let value: number | null = null;
  for (const c of data.changes) {
    if (c.from <= date) value = c.rate;
    else break;
  }
  if (value === null) {
    const first = data.changes[0];
    if (first === undefined) throw new Error('기준금리 데이터가 비어 있습니다');
    return first.rate;
  }
  return value;
}

/** 번들의 마지막 값 */
export function latestRate(data: BaseRateFile): { rate: number; asOf: string } {
  const last = data.changes[data.changes.length - 1];
  if (last === undefined) throw new Error('기준금리 데이터가 비어 있습니다');
  return { rate: last.rate, asOf: data.meta.asOf };
}

/** asOf 로부터 지난 일수 */
export function ageInDays(data: BaseRateFile, now: Date = new Date()): number {
  const asOf = new Date(`${data.meta.asOf}T00:00:00`);
  return Math.floor((now.getTime() - asOf.getTime()) / (24 * 60 * 60 * 1000));
}
