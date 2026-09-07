/**
 * 시나리오 구간 해석 — docs/FUNCTIONAL_SPEC.md §1-2
 * scenario.start 가 휴장일일 수 있으므로 그 날 이후 첫 거래일을 Day 1로 삼는다.
 */
import { candleEnd } from '@/types';
import type { Candle, Scenario } from '@/types';

export interface ResolvedRange {
  startIdx: number;
  startDate: string;
  endDate: string;
}

export function resolveRange(
  candles: Candle[],
  scenario: Pick<Scenario, 'start' | 'bars'>,
): ResolvedRange | null {
  const startIdx = candles.findIndex((c) => candleEnd(c) >= scenario.start);
  if (startIdx < 0) return null;
  const endIdx = startIdx + scenario.bars - 1;
  const first = candles[startIdx];
  const last = candles[endIdx];
  if (first === undefined || last === undefined) return null;
  return { startIdx, startDate: first.d, endDate: candleEnd(last) };
}

/** YYYYMMDD → "2008.09.15" */
export const fmtDate = (d: string) => `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
/** YYYYMMDD → "2008.09" */
export const fmtMonth = (d: string) => `${d.slice(0, 4)}.${d.slice(4, 6)}`;
