import { describe, expect, it } from 'vitest';
import { addDays, addMonths, computeSeverance, diffDays } from '../severance';
import type { SeveranceInput } from '@/types';

const base: SeveranceInput = {
  joinDate: '2021-03-02',
  lastWorkDate: '2026-08-31',
  wages3m: 11_175_000,
  annualBonus: 0,
  annualLeavePay: 0,
  ordinaryDaily: null,
};

describe('날짜 계산', () => {
  it('addDays 는 시간대 영향을 받지 않는다', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('addMonths 는 말일을 보정한다', () => {
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2024-03-31', -1)).toBe('2024-02-29'); // 윤년
    expect(addMonths('2026-09-01', -3)).toBe('2026-06-01');
  });

  it('diffDays 는 윤년을 센다', () => {
    expect(diffDays('2024-02-28', '2024-03-01')).toBe(2);
    expect(diffDays('2023-02-28', '2023-03-01')).toBe(1);
  });
});

describe('퇴직금', () => {
  it('퇴사일은 마지막 근무일의 다음 날이다', () => {
    const r = computeSeverance(base);
    expect(r.days).toBe(diffDays('2021-03-02', '2026-09-01'));
  });

  it('평균임금은 퇴사일 직전 3개월의 실제 일수로 나눈다', () => {
    const r = computeSeverance(base);
    expect(r.period3mDays).toBe(diffDays('2026-06-01', '2026-09-01')); // 92일
    expect(r.avgDaily).toBe(Math.floor(11_175_000 / 92));
  });

  it('퇴직금 = 1일 평균임금 × 30 × 재직일수 ÷ 365', () => {
    const r = computeSeverance(base);
    expect(r.severance).toBe(Math.floor((r.avgDaily * 30 * r.days) / 365));
  });

  it('상여·연차수당은 3/12 만큼 더한다', () => {
    const r = computeSeverance({ ...base, annualBonus: 6_000_000, annualLeavePay: 1_200_000 });
    const total = 11_175_000 + (6_000_000 * 3) / 12 + (1_200_000 * 3) / 12;
    expect(r.avgDaily).toBe(Math.floor(total / r.period3mDays));
  });

  it('통상임금이 평균임금보다 크면 통상임금을 쓴다', () => {
    const r = computeSeverance({ ...base, ordinaryDaily: 200_000 });
    expect(r.usedOrdinary).toBe(true);
    expect(r.avgDaily).toBe(200_000);
  });

  it('통상임금이 더 작으면 평균임금을 그대로 쓴다', () => {
    const r = computeSeverance({ ...base, ordinaryDaily: 10_000 });
    expect(r.usedOrdinary).toBe(false);
  });

  it('1년 미만 근무는 대상이 아님을 표시하고 0원을 낸다', () => {
    const r = computeSeverance({ ...base, joinDate: '2026-01-01', lastWorkDate: '2026-08-31' });
    expect(r.underOneYear).toBe(true);
    expect(r.severance).toBe(0);
  });

  it('정확히 365일 근무는 대상이다', () => {
    const r = computeSeverance({ ...base, joinDate: '2025-09-01', lastWorkDate: '2026-08-31' });
    expect(r.days).toBe(365);
    expect(r.underOneYear).toBe(false);
    expect(r.severance).toBeGreaterThan(0);
  });
});
