/** 시간축 — FUNCTIONAL_SPEC 3-7 AC. 기준금리는 실데이터(docs/FACT_CHECK.md 2장) */
import { describe, expect, it } from 'vitest';
import { timeline } from '../timeline';
import { ageInDays, latestRate, rateAt } from '../baserate';
import { baserate } from '@/data';

const now = new Date('2026-09-08T12:00:00');

describe('rateAt — 실데이터', () => {
  it('연초 기준금리가 FACT_CHECK 2장과 같다', () => {
    expect(rateAt(baserate, '2021-01-01')).toBeCloseTo(0.005, 10);
    expect(rateAt(baserate, '2022-01-01')).toBeCloseTo(0.01, 10);
    expect(rateAt(baserate, '2023-01-01')).toBeCloseTo(0.0325, 10);
    expect(rateAt(baserate, '2024-01-01')).toBeCloseTo(0.035, 10);
    expect(rateAt(baserate, '2025-01-01')).toBeCloseTo(0.03, 10);
    expect(rateAt(baserate, '2026-01-01')).toBeCloseTo(0.025, 10);
  });

  it('2026-08-27 인상으로 최신은 3.00%', () => {
    expect(rateAt(baserate, '2026-08-27')).toBeCloseTo(0.03, 10);
    expect(rateAt(baserate, '2026-08-26')).toBeCloseTo(0.0275, 10);
    expect(latestRate(baserate).rate).toBeCloseTo(0.03, 10);
  });

  it('변동 시점은 오름차순이고 연속 중복이 없다', () => {
    const { changes } = baserate;
    for (let i = 1; i < changes.length; i++) {
      const prev = changes[i - 1];
      const cur = changes[i];
      if (prev === undefined || cur === undefined) throw new Error('빈 항목');
      expect(cur.from > prev.from).toBe(true);
      expect(cur.rate).not.toBe(prev.rate);
    }
  });
});

describe('timeline', () => {
  it('2021~2026 연초 6개 + 최신 = 7개', () => {
    const rows = timeline(100_000_000, baserate, now);
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.label)).toEqual(['2021', '2022', '2023', '2024', '2025', '2026', '최신']);
  });

  it('2021년 전환율 2.50% → 보증금 1억이면 월 208,333원', () => {
    const rows = timeline(100_000_000, baserate, now);
    const y2021 = rows[0];
    if (y2021 === undefined) throw new Error('행 없음');
    expect(y2021.legalRate).toBeCloseTo(0.025, 10);
    expect(y2021.maxRent).toBe(208_333);
  });

  it('최신 전환율 5.00% → 월 416,667원 (2021년의 두 배)', () => {
    const rows = timeline(100_000_000, baserate, now);
    const last = rows[rows.length - 1];
    if (last === undefined) throw new Error('행 없음');
    expect(last.legalRate).toBeCloseTo(0.05, 10);
    expect(last.maxRent).toBe(416_667);
  });

  it('보증금 5,000만: 2021년 104,167원 → 최신 208,333원', () => {
    const rows = timeline(50_000_000, baserate, now);
    expect(rows[0]?.maxRent).toBe(104_167);
    expect(rows[rows.length - 1]?.maxRent).toBe(208_333);
  });
});

describe('ageInDays', () => {
  it('asOf 로부터 지난 일수를 센다', () => {
    expect(ageInDays(baserate, now)).toBeGreaterThanOrEqual(0);
  });
});
