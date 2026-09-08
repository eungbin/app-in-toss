/** 전환율·환산 — FUNCTIONAL_SPEC 3-2 AC */
import { describe, expect, it } from 'vitest';
import { depositToRent, equivalentDeposit, legalConversionRate, rentToDeposit } from '../rate';

describe('legalConversionRate', () => {
  it('기준금리 + 2%', () => {
    expect(legalConversionRate(0.03)).toBeCloseTo(0.05, 10);
    expect(legalConversionRate(0.005)).toBeCloseTo(0.025, 10);
  });

  it('연 10%를 넘지 않는다 (시행령 제9조 제1항)', () => {
    expect(legalConversionRate(0.085)).toBeCloseTo(0.1, 10);
    expect(legalConversionRate(0.2)).toBeCloseTo(0.1, 10);
  });

  it('정확히 8%면 상한과 같다', () => {
    expect(legalConversionRate(0.08)).toBeCloseTo(0.1, 10);
  });
});

describe('depositToRent / rentToDeposit', () => {
  it('보증금 1억, 5% → 월세 416,667원 (반올림)', () => {
    expect(depositToRent(100_000_000, 0.05)).toBe(416_667);
  });

  it('월세 50만, 5% → 보증금 1억 2,000만 원', () => {
    expect(rentToDeposit(500_000, 0.05)).toBe(120_000_000);
  });

  it('보증금 0이면 월세 0', () => {
    expect(depositToRent(0, 0.05)).toBe(0);
  });
});

describe('equivalentDeposit', () => {
  it('월세가 0이면 보증금 그대로 (부동소수 오차 없이)', () => {
    expect(equivalentDeposit({ deposit: 100_000_000, rent: 0 }, 0.05)).toBe(100_000_000);
  });

  it('보증금 5,000만 + 월세 30만, 5% → 1억 2,200만 원', () => {
    expect(equivalentDeposit({ deposit: 50_000_000, rent: 300_000 }, 0.05)).toBeCloseTo(
      122_000_000,
      6,
    );
  });
});
