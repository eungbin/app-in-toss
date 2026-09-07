import { describe, expect, it } from 'vitest';
import { applyConversion, canConvert, initialHoldings, totalP } from '../position';

describe('position', () => {
  it('시작은 전액 원화 1,000,000 P', () => {
    expect(initialHoldings()).toEqual({ krw: 1_000_000, fx: 0 });
  });

  it('명세 §3-3 검산 예제: 1100에 50% 전환 후 1210에서 총 1,050,000 P', () => {
    const h0 = initialHoldings();
    const { holdings: h1, conversion } = applyConversion(h0, 3, 'toFx', 50, 1100);
    expect(h1.krw).toBe(500_000);
    expect(h1.fx).toBeCloseTo(500_000 / 1100, 10);
    expect(conversion).toMatchObject({ day: 3, dir: 'toFx', ratio: 50, rate: 1100, amountP: 500_000 });
    expect(totalP(h1, 1210)).toBeCloseTo(1_050_000, 6);
  });

  it('전부 전환 후 되돌리면 원금 복귀 (전환 비용 0)', () => {
    const { holdings: h1 } = applyConversion(initialHoldings(), 1, 'toFx', 100, 1300);
    expect(h1.krw).toBe(0);
    const { holdings: h2 } = applyConversion(h1, 5, 'toKrw', 100, 1300);
    expect(h2.krw).toBeCloseTo(1_000_000, 6);
    expect(h2.fx).toBeCloseTo(0, 10);
  });

  it('환율이 오르면 외화 보유가 이득, 내리면 손실', () => {
    const { holdings } = applyConversion(initialHoldings(), 1, 'toFx', 100, 1000);
    expect(totalP(holdings, 1200)).toBeCloseTo(1_200_000, 6);
    expect(totalP(holdings, 900)).toBeCloseTo(900_000, 6);
  });

  it('잔고가 1P 미만이면 전환 불가', () => {
    expect(canConvert({ krw: 0, fx: 100 }, 'toFx', 1000)).toBe(false);
    expect(canConvert({ krw: 0, fx: 100 }, 'toKrw', 1000)).toBe(true);
    expect(canConvert({ krw: 500, fx: 0 }, 'toKrw', 1000)).toBe(false);
    expect(canConvert({ krw: 500, fx: 0 }, 'toFx', 1000)).toBe(true);
  });

  it('환율 0 이하는 거부', () => {
    expect(() => applyConversion(initialHoldings(), 1, 'toFx', 50, 0)).toThrow();
  });
});
