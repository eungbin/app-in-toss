import { describe, expect, it } from 'vitest';
import { dailyScenarioId, pickSegment } from '../segment';
import type { Candle } from '@/types';

const candles: Candle[] = Array.from({ length: 500 }, (_, i) => ({
  d: String(20000101 + i),
  o: 1000,
  h: 1000,
  l: 1000,
  c: 1000,
}));

const pick = (recent: number[] = [], chapters: { start: string; bars: number }[] = [], r = 0) =>
  pickSegment({ candles, bars: 60, recent, chapters, random: () => r });

describe('segment', () => {
  it('구간 끝이 시계열을 넘지 않는다', () => {
    const { startIdx } = pick([], [], 0.999999);
    expect(startIdx + 60).toBeLessThanOrEqual(candles.length);
  });

  it('최근 구간의 ±30 반경은 제외된다', () => {
    for (let r = 0; r < 1; r += 0.05) {
      const { startIdx } = pick([100], [], r);
      expect(Math.abs(startIdx - 100)).toBeGreaterThan(30);
    }
  });

  it('챕터 구간과 30일 이상 겹치면 제외된다', () => {
    const chapters = [{ start: candles[200]!.d, bars: 60 }];
    for (let r = 0; r < 1; r += 0.05) {
      const { startIdx } = pick([], chapters, r);
      const ovl = Math.min(startIdx + 59, 259) - Math.max(startIdx, 200) + 1;
      expect(ovl).toBeLessThan(30);
    }
  });

  it('후보가 없으면 recent를 비우고 재시도한다', () => {
    const recent = Array.from({ length: 500 }, (_, i) => i);
    const res = pickSegment({ candles, bars: 60, recent, chapters: [], random: () => 0 });
    expect(res.recentCleared).toBe(true);
    expect(res.startIdx).toBe(0);
  });

  it('시계열이 구간보다 짧으면 오류', () => {
    expect(() =>
      pickSegment({ candles: candles.slice(0, 10), bars: 60, recent: [], chapters: [] }),
    ).toThrow();
  });

  it('난수 1.0 경계에서도 범위를 벗어나지 않는다', () => {
    const { startIdx } = pick([], [], 0.9999999999);
    expect(startIdx).toBeLessThanOrEqual(candles.length - 60);
  });

  it('시나리오 ID 형식', () => {
    expect(dailyScenarioId('usdkrw', 42)).toBe('daily:usdkrw:42');
  });
});
