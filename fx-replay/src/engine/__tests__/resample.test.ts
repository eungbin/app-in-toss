import { describe, expect, it } from 'vitest';
import { resample, weekKey } from '../resample';
import type { Candle } from '@/types';

const c = (d: string, o: number, h: number, l: number, cl: number): Candle => ({ d, o, h, l, c: cl });

describe('weekKey', () => {
  it('그 주의 월요일을 반환한다', () => {
    expect(weekKey('20260907')).toBe('20260907'); // 월요일
    expect(weekKey('20260911')).toBe('20260907'); // 금요일 → 같은 주 월요일
    expect(weekKey('20260906')).toBe('20260831'); // 일요일 → 직전 월요일
  });

  it('연말을 넘어가도 맞다', () => {
    expect(weekKey('20260101')).toBe('20251229');
  });
});

describe('resample', () => {
  const daily = [
    c('20260907', 100, 110, 95, 105), // 월
    c('20260908', 105, 120, 100, 118), // 화
    c('20260909', 118, 125, 90, 92), // 수
    c('20260914', 92, 99, 88, 97), // 다음 주 월
    c('20260915', 97, 130, 96, 128), // 화
  ];

  it('일봉은 그대로 반환한다', () => {
    expect(resample(daily, 'day')).toBe(daily);
  });

  it('주봉: 시가는 첫날, 종가는 마지막날, 고저는 기간 전체', () => {
    const w = resample(daily, 'week');
    expect(w).toHaveLength(2);
    expect(w[0]).toEqual({ d: '20260907', de: '20260909', o: 100, h: 125, l: 90, c: 92 });
    expect(w[1]).toEqual({ d: '20260914', de: '20260915', o: 92, h: 130, l: 88, c: 128 });
  });

  it('월봉: 같은 달을 하나로 묶는다', () => {
    const m = resample(daily, 'month');
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ d: '20260907', de: '20260915', o: 100, c: 128, h: 130, l: 88 });
  });

  it('달이 바뀌면 봉이 나뉜다', () => {
    const m = resample([c('20260930', 1, 2, 1, 2), c('20261001', 2, 3, 2, 3)], 'month');
    expect(m).toHaveLength(2);
  });

  it('집계봉에도 고저 관계가 유효하다', () => {
    for (const tf of ['week', 'month'] as const) {
      for (const b of resample(daily, tf)) {
        expect(b.h).toBeGreaterThanOrEqual(Math.max(b.o, b.c));
        expect(b.l).toBeLessThanOrEqual(Math.min(b.o, b.c));
      }
    }
  });

  it('원자료의 어긋난 시·고·저·종도 집계에서 보정된다', () => {
    // 종가가 고가보다 높은 실제 사례 형태
    const odd = [c('20260907', 1279, 1283.5, 1277, 1285)];
    const w = resample(odd, 'week');
    expect(w[0]!.h).toBe(1285);
  });

  it('빈 입력에 안전하다', () => {
    expect(resample([], 'week')).toEqual([]);
  });
});
