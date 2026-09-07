/**
 * 블라인드 정규화 — docs/FUNCTIONAL_SPEC.md §3-3 (RE-3)
 * 블라인드 중에는 원값·날짜가 뷰 레이어에 절대 전달되지 않는다.
 */
import type { BlindCandle, Candle, RevealedCandle } from '@/types';

/**
 * ECOS는 시가·고가·저가·종가를 각각 별도 통계 항목으로 발행한다.
 * 종가는 15:30 기준이라 드물게 고가·저가 범위를 벗어나는 날이 있다
 * (원/달러 8,777행 중 4행, 원/위안 2,645행 중 14행 — docs/DATA_VERIFICATION.md 5절).
 * 원자료는 이용지침에 따라 변경하지 않고, 화면에 그릴 때만 네 값을 모두 포함하도록 보정한다.
 */
export const candleHigh = (c: Pick<Candle, 'o' | 'h' | 'c'>): number => Math.max(c.h, c.o, c.c);
export const candleLow = (c: Pick<Candle, 'o' | 'l' | 'c'>): number => Math.min(c.l, c.o, c.c);

/** 구간의 표시용 최고·최저 */
export function windowRange(candles: Array<Pick<Candle, 'o' | 'h' | 'l' | 'c'>>) {
  return {
    high: Math.max(...candles.map(candleHigh)),
    low: Math.min(...candles.map(candleLow)),
  };
}

/** 시작일 종가를 100으로 하는 정규화 */
export const norm = (x: number, base: number): number => (x / base) * 100;

export function toBlind(candle: Candle, day: number, base: number): BlindCandle {
  return {
    day,
    o: norm(candle.o, base),
    h: norm(candleHigh(candle), base),
    l: norm(candleLow(candle), base),
    c: norm(candle.c, base),
  };
}

export function toRevealed(candle: Candle, day: number): RevealedCandle {
  return { ...candle, day, h: candleHigh(candle), l: candleLow(candle) };
}

/** 노출된 구간(Day 1..day)을 블라인드 캔들로 변환 */
export function blindWindow(candles: Candle[], startIdx: number, day: number): BlindCandle[] {
  const first = candles[startIdx];
  if (first === undefined) throw new Error(`startIdx out of range: ${startIdx}`);
  const base = first.c;
  const out: BlindCandle[] = [];
  for (let i = 0; i < day; i++) {
    const c = candles[startIdx + i];
    if (c === undefined) break;
    out.push(toBlind(c, i + 1, base));
  }
  return out;
}

/** 노출된 구간을 실제 값 캔들로 변환 (챕터 또는 리빌 후) */
export function revealedWindow(candles: Candle[], startIdx: number, day: number): RevealedCandle[] {
  const out: RevealedCandle[] = [];
  for (let i = 0; i < day; i++) {
    const c = candles[startIdx + i];
    if (c === undefined) break;
    out.push(toRevealed(c, i + 1));
  }
  return out;
}

/**
 * 진입 이전 구간 — 차트가 1봉째부터 차 보이도록 흐리게 깔 봉들.
 * 시계열 앞쪽이 부족하면 있는 만큼만 준다.
 */
export function leadInWindow(
  candles: Candle[],
  startIdx: number,
  count: number,
  blind: boolean,
  base: number,
): Array<BlindCandle | RevealedCandle> {
  const from = Math.max(0, startIdx - count);
  const out: Array<BlindCandle | RevealedCandle> = [];
  for (let i = from; i < startIdx; i++) {
    const c = candles[i];
    if (c === undefined) continue;
    // day 는 음수(진입 전)로 두어 본 구간 번호와 섞이지 않게 한다
    const day = i - startIdx;
    out.push(blind ? toBlind(c, day, base) : toRevealed(c, day));
  }
  return out;
}
