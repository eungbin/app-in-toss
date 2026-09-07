import { describe, expect, it } from 'vitest';
import { computeGross } from '../reverse';
import { computeNet } from '../net';
import { GROSS_MAX } from '@/constants';
import { opts } from './fixtures';

const O = opts({ nonTaxableMonthly: 200_000 });
const net = (g: number) => computeNet(g, O).netMonthly;

describe('역산', () => {
  it('목표 0이면 연봉 0', () => {
    const r = computeGross(0, O);
    expect(r.annualGross).toBe(0);
    expect(r.outOfRange).toBe(false);
  });

  const targets = [500_000, 1_000_000, 2_000_000, 3_000_000, 3_333_333, 5_000_000, 10_000_000, 30_000_000];

  it.each(targets)('목표 %i 원을 실제로 달성한다', (target) => {
    const r = computeGross(target, O);
    expect(r.outOfRange).toBe(false);
    expect(r.achievedNet).toBeGreaterThanOrEqual(target);
  });

  it.each(targets)('목표 %i 원을 만족하는 가장 낮은 연봉이다', (target) => {
    const r = computeGross(target, O);
    // 12원(월 1원) 낮추면 목표에 못 미친다
    expect(net(r.annualGross - 12)).toBeLessThan(target);
  });

  it.each(targets)('목표 %i 원: 화면에 내보내는 만 원 단위 연봉에서도 목표를 만족한다', (target) => {
    // 최소 연봉과 표시 연봉 사이에 제도상 계단이 끼면 표시 연봉의 실수령이 낮아질 수 있다.
    // 그래서 표시 연봉은 따로 확인해 올린다. 화면에 함께 보이는 두 숫자가 서로 맞아야 한다.
    const r = computeGross(target, O);
    expect(r.annualGrossDisplay % 10_000).toBe(0);
    expect(r.annualGrossDisplay).toBeGreaterThanOrEqual(r.annualGross);
    expect(net(r.annualGrossDisplay), '표시 연봉의 실수령이 목표에 못 미친다').toBeGreaterThanOrEqual(target);
    expect(r.achievedNet).toBe(net(r.annualGrossDisplay));
    expect(r.breakdown.annualGross).toBe(r.annualGrossDisplay);
  });

  it('표 상한 계단 위의 목표에서도 표시 연봉이 목표를 지킨다', () => {
    // 과세 월급 1,000만 원 부근(연봉 약 1.224억)은 낙폭이 월 27,499원이라 보정이 반드시 필요하다
    for (const target of [7_600_000, 7_650_000, 7_700_000, 7_750_000]) {
      const r = computeGross(target, O);
      expect(net(r.annualGrossDisplay), `목표 ${target}`).toBeGreaterThanOrEqual(target);
    }
  });

  it('탐색 범위를 넘으면 표시한다', () => {
    const r = computeGross(net(GROSS_MAX) + 1_000_000, O);
    expect(r.outOfRange).toBe(true);
  });

  it('부양가족이 많을수록 같은 실수령에 필요한 연봉이 적다', () => {
    const one = computeGross(3_000_000, opts({ nonTaxableMonthly: 200_000, dependents: 1 }));
    const four = computeGross(3_000_000, opts({ nonTaxableMonthly: 200_000, dependents: 4 }));
    expect(four.annualGross).toBeLessThan(one.annualGross);
  });

  it('한 번의 역산이 50ms 안에 끝난다', () => {
    const t0 = performance.now();
    computeGross(3_000_000, O);
    expect(performance.now() - t0).toBeLessThan(50);
  });
});
