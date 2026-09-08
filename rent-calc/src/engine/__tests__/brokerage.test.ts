/** 중개보수 — FUNCTIONAL_SPEC 3-5 AC. 기대값은 마이홈포털 계산기(docs/FACT_CHECK.md 3-4) */
import { describe, expect, it } from 'vitest';
import { brokerageCap, transactionAmount } from '../brokerage';
import { brokerage } from '@/data';
import type { BrokerageInput } from '@/types';

const lease = (deposit: number, rent: number, officetel: BrokerageInput['officetel'] = 'no'): BrokerageInput => ({
  kind: 'lease',
  deposit,
  rent,
  officetel,
});

describe('transactionAmount', () => {
  it('보증금 + 월세 × 100', () => {
    expect(transactionAmount(lease(30_000_000, 500_000))).toEqual({
      tx: 80_000_000,
      usedMultiplier: 100,
    });
  });

  it('5천만 원 미만이면 × 70으로 다시 계산', () => {
    expect(transactionAmount(lease(10_000_000, 300_000))).toEqual({
      tx: 31_000_000,
      usedMultiplier: 70,
    });
  });

  it('정확히 5천만 원이면 × 100 그대로', () => {
    expect(transactionAmount(lease(20_000_000, 300_000))).toEqual({
      tx: 50_000_000,
      usedMultiplier: 100,
    });
  });

  it('월세가 없으면 보증금이 거래금액', () => {
    expect(transactionAmount(lease(200_000_000, 0)).tx).toBe(200_000_000);
  });
});

describe('brokerageCap — 주택 임대차 (마이홈포털 대조)', () => {
  it('B1 보증금 1,000만 + 월 30만 → 155,000원 (×70, 0.5%)', () => {
    const r = brokerageCap(lease(10_000_000, 300_000), brokerage);
    expect(r.tx).toBe(31_000_000);
    expect(r.usedMultiplier).toBe(70);
    expect(r.ratio).toBe(0.005);
    expect(r.fee).toBe(155_000);
  });

  it('B2 보증금 3,000만 + 월 50만 → 한도액 300,000원', () => {
    const r = brokerageCap(lease(30_000_000, 500_000), brokerage);
    expect(r.rawFee).toBe(320_000);
    expect(r.cap).toBe(300_000);
    expect(r.fee).toBe(300_000);
  });

  it('B3 전세 2억 → 600,000원 (0.3%, 한도 없음)', () => {
    const r = brokerageCap(lease(200_000_000, 0), brokerage);
    expect(r.fee).toBe(600_000);
    expect(r.cap).toBeNull();
  });

  it('B5 경계: 거래금액 정확히 5천만 → 0.4% 구간, 한도 200,000원', () => {
    const r = brokerageCap(lease(20_000_000, 300_000), brokerage);
    expect(r.ratio).toBe(0.004);
    expect(r.fee).toBe(200_000);
  });

  it('B7 전세 7억 → 2,800,000원', () => {
    expect(brokerageCap(lease(700_000_000, 0), brokerage).fee).toBe(2_800_000);
  });

  it('B8 전세 13억 → 6,500,000원', () => {
    expect(brokerageCap(lease(1_300_000_000, 0), brokerage).fee).toBe(6_500_000);
  });

  it('B9 전세 16억 → 9,600,000원', () => {
    expect(brokerageCap(lease(1_600_000_000, 0), brokerage).fee).toBe(9_600_000);
  });

  it('B10 보증금 0 + 월 40만 → 140,000원', () => {
    const r = brokerageCap(lease(0, 400_000), brokerage);
    expect(r.tx).toBe(28_000_000);
    expect(r.fee).toBe(140_000);
  });
});

describe('brokerageCap — 오피스텔', () => {
  it('B4 요건 충족 보증금 1억 + 월 50만 → 0.4%, 600,000원', () => {
    const r = brokerageCap(lease(100_000_000, 500_000, 'qualified'), brokerage);
    expect(r.tx).toBe(150_000_000);
    expect(r.ratio).toBe(0.004);
    expect(r.fee).toBe(600_000);
    expect(r.cap).toBeNull();
  });

  it('요건 미충족은 0.9% 이내 협의', () => {
    const r = brokerageCap(lease(100_000_000, 500_000, 'other'), brokerage);
    expect(r.ratio).toBe(0.009);
    expect(r.fee).toBe(1_350_000);
    expect(r.negotiable).toBe(true);
  });
});

describe('brokerageCap — 매매 [P1 UI]', () => {
  it('매매 5억 → 0.4%, 2,000,000원', () => {
    const r = brokerageCap({ kind: 'sale', deposit: 500_000_000, rent: 0, officetel: 'no' }, brokerage);
    expect(r.ratio).toBe(0.004);
    expect(r.fee).toBe(2_000_000);
  });

  it('매매 4,000만 → 0.6%이지만 한도 250,000원', () => {
    const r = brokerageCap({ kind: 'sale', deposit: 40_000_000, rent: 0, officetel: 'no' }, brokerage);
    expect(r.rawFee).toBe(240_000);
    expect(r.fee).toBe(240_000);
  });
});
