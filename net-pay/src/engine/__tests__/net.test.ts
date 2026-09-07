import { describe, expect, it } from 'vitest';
import { computeNet } from '../net';
import { DATA, opts } from './fixtures';

const net = (gross: number, over = {}) => computeNet(gross, opts(over), DATA);

describe('정방향 계산', () => {
  it('연봉 0이면 모든 항목이 0', () => {
    const b = net(0);
    expect(b.grossMonthly).toBe(0);
    expect(b.deductions).toBe(0);
    expect(b.netMonthly).toBe(0);
    expect(b.capped).toEqual({ nps: null, nhis: null });
  });

  it('비과세를 뺀 금액이 과세 월급이 된다', () => {
    const b = net(48_000_000, { nonTaxableMonthly: 200_000 });
    expect(b.grossMonthly).toBe(4_000_000);
    expect(b.taxableMonthly).toBe(3_800_000);
  });

  it('국민연금은 천 원 단위 기준소득월액에 근로자 요율을 곱한다', () => {
    // 과세 3,000,000 → 기준 3,000,000 × 9.5% × 0.5 = 142,500
    const b = net(36_000_000);
    expect(b.taxableMonthly).toBe(3_000_000);
    expect(b.nps).toBe(142_500);
  });

  it('국민연금 기준소득월액은 천 원 미만을 버린다', () => {
    // 과세 3,000,999 → 기준 3,000,000
    const b = net(36_011_988);
    expect(b.taxableMonthly).toBe(3_000_999);
    expect(b.nps).toBe(142_500);
  });

  it('국민연금 상·하한이 걸리면 표시한다', () => {
    const low = net(3_600_000); // 과세 300,000 < 하한 410,000
    expect(low.capped.nps).toBe('min');
    expect(low.nps).toBe(Math.floor(410_000 * 0.095 * 0.5));

    const high = net(120_000_000); // 과세 10,000,000 > 상한 6,590,000
    expect(high.capped.nps).toBe('max');
    expect(high.nps).toBe(Math.floor(6_590_000 * 0.095 * 0.5));
  });

  it('건강보험은 보수월액보험료 총액에 상한을 적용한 뒤 절반을 부담한다', () => {
    const b = net(36_000_000);
    // 3,000,000 × 7.19% = 215,700 → 절반 107,850
    expect(b.nhis).toBe(107_850);
    // 장기요양 = 근로자 건보료 × 13.14%
    expect(b.ltc).toBe(Math.floor((107_850 * 0.1314) / 10) * 10);
  });

  it('건강보험 상한이 걸리면 표시한다', () => {
    const b = net(30_000_000_000 / 12 * 12); // 과세가 상한을 크게 넘는 연봉
    expect(b.capped.nhis).toBe('max');
    expect(b.nhis).toBe(Math.floor((9_183_480 * 0.5) / 10) * 10);
  });

  it('고용보험은 과세 월급의 0.9%', () => {
    const b = net(36_000_000);
    expect(b.ei).toBe(Math.floor((3_000_000 * 0.009) / 10) * 10);
  });

  it('지방소득세는 소득세의 10%', () => {
    const b = net(12_120_000); // 과세 1,010,000 → 세액 2,000
    expect(b.incomeTax).toBe(2000);
    expect(b.localTax).toBe(200);
  });

  it('공제 합계와 실수령이 항목 합과 맞는다', () => {
    const b = net(50_000_000);
    expect(b.deductions).toBe(b.nps + b.nhis + b.ltc + b.ei + b.incomeTax + b.localTax);
    expect(b.netMonthly).toBe(b.grossMonthly - b.deductions);
    expect(b.netAnnual).toBe(b.netMonthly * 12);
  });

  it('기준일에 맞는 요율을 쓴다', () => {
    const y2025 = computeNet(36_000_000, opts({ asOf: '2025-06-30' }), DATA);
    const y2026 = computeNet(36_000_000, opts({ asOf: '2026-06-30' }), DATA);
    // 국민연금 요율이 9.0% → 9.5% 로 올라 부담이 커진다
    expect(y2025.nps).toBeLessThan(y2026.nps);
  });

  it('해당 시점의 세액표가 없으면 현행 표로 대체하고 표시한다', () => {
    const old = computeNet(36_000_000, opts({ asOf: '2021-12-31' }), DATA);
    expect(old.taxTableFallback).toBe(true);
    expect(old.taxTableEffectiveFrom).toBe('2026-03-01');
    expect(net(36_000_000).taxTableFallback).toBe(false);
  });
});

describe('정방향 계산 — 번들 데이터 성질', () => {
  const O = opts({ nonTaxableMonthly: 200_000 });

  it('과세 소득이 생기는 순간 보험료 하한 때문에 실수령이 한 번 떨어진다', () => {
    // 과세 월급 0원 → 공제 0원. 1원이라도 생기면 국민연금·건강보험 하한이 걸린다.
    // 최저임금에 한참 못 미치는 구간에서만 나타나는 제도상 계단이며, 계산이 틀린 것이 아니다.
    const before = computeNet(2_400_000, O).netMonthly; // 월 세전 200,000 = 비과세와 같음
    const after = computeNet(2_520_000, O).netMonthly; // 월 세전 210,000
    expect(before).toBe(200_000);
    expect(after).toBeLessThan(before);
    expect(computeNet(2_520_000, O).capped).toEqual({ nps: 'min', nhis: 'min' });
  });

  it('보험료 하한을 벗어난 뒤에는 세액표 구간 폭(연봉 12만 원) 격자에서 실수령이 줄지 않는다', () => {
    // 역산이 이 성질에 기대므로 반드시 지켜져야 한다.
    // 시작점은 하한이 더 이상 걸리지 않는 연봉(과세 월급 > 국민연금 하한)보다 위로 잡는다.
    let prev = -Infinity;
    for (let g = 12_000_000; g <= 600_000_000; g += 120_000) {
      const n = computeNet(g, O).netMonthly;
      expect(n, `연봉 ${g}에서 실수령이 감소했다`).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });
});
