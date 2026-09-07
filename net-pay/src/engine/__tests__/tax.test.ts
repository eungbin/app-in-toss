import { describe, expect, it } from 'vitest';
import { childDeduction, lookupIncomeTax } from '../tax';
import { TABLE } from './fixtures';

const look = (taxable: number, dependents = 1, children = 0) =>
  lookupIncomeTax(TABLE, taxable, dependents, children);

describe('간이세액 조회', () => {
  it('표 하한 미만은 0원', () => {
    expect(look(999_999)).toBe(0);
    expect(look(0)).toBe(0);
  });

  it('구간 경계에서 올바른 행을 고른다', () => {
    expect(look(1_000_000)).toBe(1000);
    expect(look(1_009_999)).toBe(1000);
    expect(look(1_010_000)).toBe(2000);
    expect(look(1_029_999)).toBe(3000);
  });

  it('공제대상 가족 수만큼 열을 옮긴다', () => {
    expect(look(1_000_000, 1)).toBe(1000);
    expect(look(1_000_000, 5)).toBe(600);
    expect(look(1_000_000, 11)).toBe(0);
  });

  it('가족 수는 1~11로 잘린다', () => {
    expect(look(1_000_000, 0)).toBe(look(1_000_000, 1));
    expect(look(1_000_000, 99)).toBe(look(1_000_000, 11));
  });

  it('자녀 차감액은 1명·2명·3명 이상 규칙을 따른다', () => {
    expect(childDeduction(TABLE, 0)).toBe(0);
    expect(childDeduction(TABLE, 1)).toBe(20_830);
    expect(childDeduction(TABLE, 2)).toBe(45_830);
    expect(childDeduction(TABLE, 3)).toBe(45_830 + 33_330);
    expect(childDeduction(TABLE, 5)).toBe(45_830 + 33_330 * 3);
  });

  it('자녀 차감 후 세액은 음수가 되지 않는다', () => {
    expect(look(1_000_000, 1, 3)).toBe(0);
  });

  it('표 상한을 넘으면 구간 산식으로 잇는다', () => {
    // 1,030,000 초과: 마지막 구간 세액 3000 + add 500 + 초과분 × 0.98 × 0.1
    expect(look(1_030_000)).toBeCloseTo(3000 + 500, 6);
    expect(look(1_040_000)).toBeCloseTo(3000 + 500 + 10_000 * 0.98 * 0.1, 6);
    // 두 번째 구간까지 누적
    const expected = 3000 + 500 + 970_000 * 0.98 * 0.1 + 500_000 * 0.98 * 0.2;
    expect(look(2_500_000)).toBeCloseTo(expected, 6);
  });

  it('표 상한 위에서도 세액은 급여에 따라 늘어난다', () => {
    let prev = -1;
    for (let t = 1_030_000; t <= 5_000_000; t += 10_000) {
      const v = look(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
