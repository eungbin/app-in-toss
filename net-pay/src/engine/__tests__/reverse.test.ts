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

  it.each(targets)('목표 %i 원: 답보다 높은 연봉에서 목표 아래로 떨어지지 않는다', (target) => {
    const r = computeGross(target, O);
    // 세액표 한 구간(연봉 12만 원) 앞까지 확인한다
    for (let g = r.annualGross; g <= r.annualGross + 120_000; g += 12) {
      expect(net(g), `연봉 ${g}에서 목표 아래로 떨어졌다`).toBeGreaterThanOrEqual(target);
    }
  });

  it('표시용 연봉은 만 원 단위로 올린다', () => {
    const r = computeGross(3_000_000, O);
    expect(r.annualGrossDisplay % 10_000).toBe(0);
    expect(r.annualGrossDisplay).toBeGreaterThanOrEqual(r.annualGross);
    expect(r.annualGrossDisplay - r.annualGross).toBeLessThan(10_000);
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
