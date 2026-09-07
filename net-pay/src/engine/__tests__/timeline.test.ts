import { describe, expect, it } from 'vitest';
import { computeTimeline, timelineYears } from '../timeline';
import { rateForYear } from '../rates';
import { RATES } from '@/data';
import { TIMELINE_FROM_YEAR } from '@/constants';
import { opts } from './fixtures';

const O = opts({ nonTaxableMonthly: 200_000, asOf: '2026-09-07' });

describe('시간축', () => {
  it('2021년부터 기준 연도까지 이어진다', () => {
    expect(timelineYears('2026-09-07')).toEqual([2021, 2022, 2023, 2024, 2025, 2026]);
    expect(timelineYears('2026-09-07')[0]).toBe(TIMELINE_FROM_YEAR);
  });

  it('각 행의 요율이 그 해 하반기 시행값과 같다', () => {
    const { rows } = computeTimeline(48_000_000, O);
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      const r = rateForYear(RATES, row.year);
      expect(row.rates.npsTotal).toBe(r.nps.totalRate);
      expect(row.rates.nhisTotal).toBe(r.nhis.totalRate);
      expect(row.rates.ltcOnPremium).toBe(r.nhis.ltcRateOnPremium);
    }
  });

  it('요율이 오른 만큼 같은 연봉의 공제가 늘어난다', () => {
    const { rows, deltaDeductions, baseYear } = computeTimeline(48_000_000, O);
    const first = rows[0]!;
    const last = rows[rows.length - 1]!;
    expect(baseYear).toBe(2021);
    expect(deltaDeductions).toBe(last.deductions - first.deductions);
    // 국민연금 9.0 → 9.5%, 건강보험 6.86 → 7.19% 로 올랐다
    expect(deltaDeductions).toBeGreaterThan(0);
    expect(last.netMonthly).toBeLessThan(first.netMonthly);
  });

  it('세액표가 없는 연도는 폴백으로 표시한다', () => {
    const { fallbackYears } = computeTimeline(48_000_000, O);
    // 현재 번들에는 2026-03-01 시행판 하나뿐이라 그 이전 연도는 모두 폴백이다
    expect(fallbackYears).toContain(2021);
    expect(fallbackYears).not.toContain(2026);
  });
});
