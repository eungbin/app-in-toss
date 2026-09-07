/**
 * 일봉 → 주봉·월봉 집계.
 * ECOS 원자료를 바꾸지 않고, 같은 값을 기간 단위로 묶기만 한다(표준 리샘플링).
 *   시가 = 기간 첫 거래일의 시가
 *   고가·저가 = 기간 내 최고·최저 (표시 보정값 기준)
 *   종가 = 기간 마지막 거래일의 종가
 */
import type { Candle, Timeframe } from '@/types';
import { candleHigh, candleLow } from './normalize';

/** YYYYMMDD → 그 날이 속한 주의 월요일 YYYYMMDD */
export function weekKey(d: string): string {
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(4, 6));
  const day = Number(d.slice(6, 8));
  const date = new Date(Date.UTC(y, m - 1, day));
  // getUTCDay: 0=일 … 6=토. 월요일 시작으로 맞춘다.
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return (
    `${date.getUTCFullYear()}` +
    `${String(date.getUTCMonth() + 1).padStart(2, '0')}` +
    `${String(date.getUTCDate()).padStart(2, '0')}`
  );
}

const monthKey = (d: string): string => d.slice(0, 6);

const keyOf = (d: string, tf: Timeframe): string =>
  tf === 'week' ? weekKey(d) : tf === 'month' ? monthKey(d) : d;

export function resample(candles: Candle[], tf: Timeframe): Candle[] {
  if (tf === 'day') return candles;

  const out: Candle[] = [];
  let key = '';
  let bucket: Candle[] = [];

  const flush = () => {
    if (bucket.length === 0) return;
    const first = bucket[0]!;
    const last = bucket[bucket.length - 1]!;
    out.push({
      d: first.d,
      de: last.d,
      o: first.o,
      h: Math.max(...bucket.map(candleHigh)),
      l: Math.min(...bucket.map(candleLow)),
      c: last.c,
    });
    bucket = [];
  };

  for (const c of candles) {
    const k = keyOf(c.d, tf);
    if (k !== key) {
      flush();
      key = k;
    }
    bucket.push(c);
  }
  flush();
  return out;
}
