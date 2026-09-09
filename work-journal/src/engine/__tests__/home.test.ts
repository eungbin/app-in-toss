import { describe, expect, it } from 'vitest';
import { shortMoney } from '@/screens/Home';

describe('달력 금액 축약', () => {
  it('10만 원 미만은 천 단위 — 구판·시안 표기', () => {
    expect(shortMoney(82_560)).toBe('83천');
    expect(shortMoney(72_240)).toBe('72천');
    expect(shortMoney(9_500)).toBe('10천');
    expect(shortMoney(0)).toBe('0천');
  });

  it('10만 원 이상은 만 단위', () => {
    expect(shortMoney(100_000)).toBe('10만');
    expect(shortMoney(165_120)).toBe('16.5만');
    expect(shortMoney(1_200_000)).toBe('120만');
  });
});
