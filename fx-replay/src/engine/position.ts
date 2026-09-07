/**
 * 포지션 계산 — docs/FUNCTIONAL_SPEC.md §3-3 (RE-4, RE-5)
 * 전환 비용 0, 해당 Day 종가로 즉시 체결.
 */
import type { ConvertDir, ConvertRatio, Conversion, Holdings } from '@/types';
import { START_P } from '@/constants';

export const initialHoldings = (): Holdings => ({ krw: START_P, fx: 0 });

/** 해당 시점 총 P (원화 환산) */
export function totalP(h: Holdings, rate: number): number {
  return h.krw + h.fx * rate;
}

/** 표시용 정수 P */
export function displayP(v: number): number {
  return Math.round(v);
}

/** 전환 가능 여부 — 바꿀 금액이 1P 미만이면 비활성 */
export function canConvert(h: Holdings, dir: ConvertDir, rate: number): boolean {
  return dir === 'toFx' ? h.krw >= 1 : h.fx * rate >= 1;
}

export interface ApplyResult {
  holdings: Holdings;
  conversion: Conversion;
}

/**
 * 전환 체결. 호출 전 canConvert로 검사할 것.
 * toFx: 원화의 ratio%를 외화로. toKrw: 외화의 ratio%를 원화로.
 */
export function applyConversion(
  h: Holdings,
  day: number,
  dir: ConvertDir,
  ratio: ConvertRatio,
  rate: number,
): ApplyResult {
  if (rate <= 0) throw new Error(`invalid rate: ${rate}`);
  if (dir === 'toFx') {
    const amountP = h.krw * (ratio / 100);
    return {
      holdings: { krw: h.krw - amountP, fx: h.fx + amountP / rate },
      conversion: { day, dir, ratio, rate, amountP },
    };
  }
  const amountFx = h.fx * (ratio / 100);
  const amountP = amountFx * rate;
  return {
    holdings: { krw: h.krw + amountP, fx: h.fx - amountFx },
    conversion: { day, dir, ratio, rate, amountP },
  };
}
