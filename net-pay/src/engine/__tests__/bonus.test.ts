import { describe, expect, it } from 'vitest';
import { computeBonusSplit, hasBonus } from '../bonus';
import { computeNet } from '../net';
import { opts } from './fixtures';

const O = opts({ nonTaxableMonthly: 200_000, asOf: '2026-09-07' });

describe('상여 계획 판별', () => {
  it('횟수나 금액이 0이면 상여 없음', () => {
    expect(hasBonus({ count: 0, annualTotal: 6_000_000 })).toBe(false);
    expect(hasBonus({ count: 2, annualTotal: 0 })).toBe(false);
    expect(hasBonus({ count: 2, annualTotal: 6_000_000 })).toBe(true);
  });
});

describe('상여 분리 — 구조', () => {
  it('상여 총액은 연봉에서 빠져 기본급이 된다', () => {
    const r = computeBonusSplit(48_000_000, { count: 2, annualTotal: 12_000_000 }, O);
    expect(r.bonusEach).toBe(6_000_000);
    expect(r.baseMonthly).toBe(3_000_000); // (4,800만 − 1,200만) ÷ 12
    expect(r.plainMonths).toBe(10);
    expect(r.bonusMonths).toBe(2);
  });

  it('지급대상기간은 12 ÷ 횟수이고 끝수는 1개월로 올린다 (법 제136조 제1항 제3호)', () => {
    expect(computeBonusSplit(48_000_000, { count: 1, annualTotal: 1_200_000 }, O).periodMonths).toBe(12);
    expect(computeBonusSplit(48_000_000, { count: 2, annualTotal: 1_200_000 }, O).periodMonths).toBe(6);
    expect(computeBonusSplit(48_000_000, { count: 4, annualTotal: 1_200_000 }, O).periodMonths).toBe(3);
    expect(computeBonusSplit(48_000_000, { count: 5, annualTotal: 1_200_000 }, O).periodMonths).toBe(3); // 2.4 → 3
    expect(computeBonusSplit(48_000_000, { count: 12, annualTotal: 1_200_000 }, O).periodMonths).toBe(1);
  });

  it('상여 달 세전은 기본급 + 상여 1회분', () => {
    const r = computeBonusSplit(48_000_000, { count: 2, annualTotal: 12_000_000 }, O);
    expect(r.plain.gross).toBe(3_000_000);
    expect(r.bonus.gross).toBe(9_000_000);
  });
});

describe('상여 분리 — 4대보험', () => {
  it('국민연금·건강보험·장기요양은 상여 달에도 같다 (연봉 기준으로 부과)', () => {
    const r = computeBonusSplit(48_000_000, { count: 2, annualTotal: 12_000_000 }, O);
    expect(r.bonus.nps).toBe(r.plain.nps);
    expect(r.bonus.nhis).toBe(r.plain.nhis);
    expect(r.bonus.ltc).toBe(r.plain.ltc);
  });

  it('세 항목은 상여를 포함한 연봉 ÷ 12 기준이라 상여 없는 계산과 같다', () => {
    const split = computeBonusSplit(48_000_000, { count: 2, annualTotal: 12_000_000 }, O);
    const flat = computeNet(48_000_000, O);
    expect(split.plain.nps).toBe(flat.nps);
    expect(split.plain.nhis).toBe(flat.nhis);
    expect(split.plain.ltc).toBe(flat.ltc);
  });

  it('고용보험만 그 달 지급액 기준이라 상여 달에 더 많다', () => {
    const r = computeBonusSplit(48_000_000, { count: 2, annualTotal: 12_000_000 }, O);
    expect(r.bonus.ei).toBeGreaterThan(r.plain.ei);
  });
});

describe('상여 분리 — 소득세', () => {
  it('상여 달 세액이 상여 없는 달보다 크다', () => {
    const r = computeBonusSplit(48_000_000, { count: 2, annualTotal: 12_000_000 }, O);
    expect(r.bonus.incomeTax).toBeGreaterThan(r.plain.incomeTax);
  });

  it('연간 소득세 합계가 간이세액(월평균) × 12와 맞는다 (법 제136조의 취지)', () => {
    // 지급대상기간마다 총액이 간이세액(월평균) × 기간월수가 되도록 설계했다
    const r = computeBonusSplit(48_000_000, { count: 2, annualTotal: 12_000_000 }, O);
    const annual = r.plain.incomeTax * r.plainMonths + r.bonus.incomeTax * r.bonusMonths;
    const flat = computeNet(48_000_000, O);
    // 월평균 기준 세액 × 12 와 10원 절사 오차 범위에서 같다
    expect(Math.abs(annual - flat.incomeTax * 12)).toBeLessThanOrEqual(10 * 12);
  });

  it('상여를 매월 받으면(12회) 상여 없는 계산과 사실상 같아진다', () => {
    const r = computeBonusSplit(48_000_000, { count: 12, annualTotal: 12_000_000 }, O);
    const flat = computeNet(48_000_000, O);
    expect(r.bonus.gross).toBe(flat.grossMonthly);
    expect(Math.abs(r.bonus.net - flat.netMonthly)).toBeLessThanOrEqual(10);
  });

  it('세액은 음수가 되지 않는다', () => {
    const r = computeBonusSplit(30_000_000, { count: 1, annualTotal: 20_000_000 }, O);
    expect(r.bonus.incomeTax).toBeGreaterThanOrEqual(0);
    expect(r.plain.incomeTax).toBeGreaterThanOrEqual(0);
  });
});

describe('상여 분리 — 합계', () => {
  it('연간 실수령 = 상여 없는 달 × 개월 + 상여 달 × 횟수', () => {
    const r = computeBonusSplit(48_000_000, { count: 2, annualTotal: 12_000_000 }, O);
    expect(r.annualNet).toBe(r.plain.net * r.plainMonths + r.bonus.net * r.bonusMonths);
  });

  it('연간 실수령이 상여 없이 계산한 연 실수령과 크게 다르지 않다', () => {
    const r = computeBonusSplit(48_000_000, { count: 2, annualTotal: 12_000_000 }, O);
    const flat = computeNet(48_000_000, O);
    // 상여 특례는 연간 총액을 맞추는 구조라 차이가 작아야 한다 (절사 누적분만)
    expect(Math.abs(r.annualNet - flat.netAnnual)).toBeLessThan(20_000);
  });

  it('각 달의 공제 합계와 실수령이 항목 합과 맞는다', () => {
    const r = computeBonusSplit(48_000_000, { count: 2, annualTotal: 12_000_000 }, O);
    for (const m of [r.plain, r.bonus]) {
      expect(m.deductions).toBe(m.nps + m.nhis + m.ltc + m.ei + m.incomeTax + m.localTax);
      expect(m.net).toBe(m.gross - m.deductions);
    }
  });
});
