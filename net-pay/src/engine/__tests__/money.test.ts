import { describe, expect, it } from 'vitest';
import { ceilTo10k, clamp, floor1, floor10, truncTo } from '../money';

describe('금액 헬퍼', () => {
  it('truncTo 는 단위 미만을 버린다', () => {
    expect(truncTo(1_234_567, 1000)).toBe(1_234_000);
    expect(truncTo(999, 1000)).toBe(0);
    expect(truncTo(1000, 1000)).toBe(1000);
  });

  it('floor10 은 10원 미만을 버린다', () => {
    expect(floor10(1239)).toBe(1230);
    expect(floor10(1230)).toBe(1230);
    expect(floor10(9)).toBe(0);
  });

  it('floor1 은 원 미만을 버린다', () => {
    expect(floor1(167_437.5)).toBe(167_437);
  });

  it('clamp 는 상·하한을 적용한다', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });

  it('ceilTo10k 는 만 원 단위로 올린다', () => {
    expect(ceilTo10k(40_962_204)).toBe(40_970_000);
    expect(ceilTo10k(40_960_000)).toBe(40_960_000);
    expect(ceilTo10k(0)).toBe(0);
  });
});
