import { describe, expect, it } from 'vitest';
import { blindWindow, norm, revealedWindow } from '../normalize';
import type { Candle } from '@/types';

const candles: Candle[] = [
  { d: '20080901', o: 1000, h: 1020, l: 990, c: 1000 },
  { d: '20080902', o: 1000, h: 1100, l: 1000, c: 1080 },
  { d: '20080903', o: 1080, h: 1120, l: 1050, c: 1100 },
];

describe('normalize', () => {
  it('시작 종가를 100으로 정규화', () => {
    expect(norm(1100, 1000)).toBeCloseTo(110, 10);
  });

  it('블라인드 캔들에는 날짜가 없다', () => {
    const w = blindWindow(candles, 0, 3);
    expect(w).toHaveLength(3);
    for (const c of w) {
      expect(Object.keys(c).sort()).toEqual(['c', 'day', 'h', 'l', 'o']);
      expect(JSON.stringify(c)).not.toContain('2008');
    }
  });

  it('블라인드 값은 시작 종가 기준 정규화', () => {
    const w = blindWindow(candles, 0, 3);
    expect(w[0]?.c).toBeCloseTo(100, 10);
    expect(w[1]?.c).toBeCloseTo(108, 10);
    expect(w[2]?.c).toBeCloseTo(110, 10);
  });

  it('노출된 Day까지만 반환한다 (미래 캔들 누출 없음)', () => {
    expect(blindWindow(candles, 0, 1)).toHaveLength(1);
    expect(revealedWindow(candles, 0, 2)).toHaveLength(2);
  });

  it('리빌 캔들에는 실제 날짜가 있다', () => {
    const w = revealedWindow(candles, 0, 3);
    expect(w[0]?.d).toBe('20080901');
    expect(w[2]?.day).toBe(3);
  });

  it('중간 인덱스에서 시작해도 그 날 종가가 기준', () => {
    const w = blindWindow(candles, 1, 2);
    expect(w[0]?.c).toBe(100);
    expect(w[1]?.c).toBeCloseTo((1100 / 1080) * 100, 10);
  });
});
