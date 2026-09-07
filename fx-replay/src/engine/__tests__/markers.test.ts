import { describe, expect, it } from 'vitest';
import { autoMarkers, baseRateMarkers, dailyDebrief, volatilityMarkers } from '../markers';
import type { Candle } from '@/types';

const window: Candle[] = [
  { d: '20081001', o: 1200, h: 1210, l: 1190, c: 1200 },
  { d: '20081002', o: 1200, h: 1260, l: 1200, c: 1260 }, // +5.0%
  { d: '20081003', o: 1260, h: 1270, l: 1250, c: 1266 }, // +0.48%
  { d: '20081006', o: 1266, h: 1270, l: 1140, c: 1140 }, // -9.95% → 반올림 -10.0%
];

describe('markers', () => {
  it('변동폭 상위 2일을 날짜순으로 반환', () => {
    const m = volatilityMarkers(window);
    expect(m).toHaveLength(2);
    expect(m[0]?.d).toBe('20081002');
    expect(m[0]?.label).toBe('하루 +5.0%');
    expect(m[1]?.d).toBe('20081006');
    expect(m[1]?.label).toBe('하루 −10.0%');
  });

  it('자동 마커에는 서술 문장이 없다 (원칙 B)', () => {
    for (const m of autoMarkers(window, [])) expect(m.body).toBe('');
  });

  it('구간 내 기준금리 변경만 잡는다', () => {
    const rates = [
      { d: '20080901', v: 5.25 },
      { d: '20081002', v: 5.25 },
      { d: '20081006', v: 5.0 },
      { d: '20081201', v: 4.0 },
    ];
    const m = baseRateMarkers(window, rates);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ d: '20081006', label: '기준금리 5.25%→5.00%' });
  });

  it('빈 구간에서 안전하다', () => {
    expect(baseRateMarkers([], [])).toEqual([]);
    expect(volatilityMarkers([])).toEqual([]);
    expect(dailyDebrief([], '원/달러 환율')).toBe('');
  });

  it('daily 해설은 사실만 서술한다', () => {
    const text = dailyDebrief(window, '원/달러 환율');
    expect(text).toBe(
      '이 구간은 2008.10.01부터 2008.10.06까지의 원/달러 환율이었다. 기간 중 최고 1,270원, 최저 1,140원을 기록했다.',
    );
    expect(text).not.toMatch(/지금|전망|추천|사라|팔아라/);
  });
});
