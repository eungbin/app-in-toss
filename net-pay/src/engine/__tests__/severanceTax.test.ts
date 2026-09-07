import { describe, expect, it } from 'vitest';
import {
  basicTax,
  computeSeveranceTax,
  convertedDeduction,
  serviceYears,
  yearsDeduction,
} from '../severanceTax';

describe('근속연수', () => {
  it('1년 미만의 기간은 1년으로 본다 (소득세법 제48조)', () => {
    expect(serviceYears(1)).toBe(1);
    expect(serviceYears(365)).toBe(1);
    expect(serviceYears(366)).toBe(2);
    expect(serviceYears(2009)).toBe(6); // 5년 6개월 → 6년
    expect(serviceYears(3650)).toBe(10);
  });
});

describe('근속연수공제 — 국세청 표', () => {
  it('구간별 금액', () => {
    expect(yearsDeduction(1)).toBe(1_000_000);
    expect(yearsDeduction(5)).toBe(5_000_000);
    expect(yearsDeduction(6)).toBe(7_000_000); // 500만 + 1×200만
    expect(yearsDeduction(10)).toBe(15_000_000);
    expect(yearsDeduction(11)).toBe(17_500_000); // 1,500만 + 1×250만
    expect(yearsDeduction(20)).toBe(40_000_000);
    expect(yearsDeduction(21)).toBe(43_000_000); // 4,000만 + 1×300만
  });

  it('구간 경계에서 이어진다', () => {
    expect(yearsDeduction(5)).toBe(5 * 1_000_000);
    expect(yearsDeduction(10)).toBe(5_000_000 + 5 * 2_000_000);
    expect(yearsDeduction(20)).toBe(15_000_000 + 10 * 2_500_000);
  });
});

describe('환산급여공제 — 국세청 표', () => {
  it('800만 원 이하는 전액 공제라 과세표준이 0이 된다', () => {
    expect(convertedDeduction(5_000_000)).toBe(5_000_000);
    expect(convertedDeduction(8_000_000)).toBe(8_000_000);
  });

  it('구간별 금액과 경계 연속성', () => {
    expect(convertedDeduction(70_000_000)).toBe(8_000_000 + 62_000_000 * 0.6); // 45,200,000
    expect(convertedDeduction(70_000_000)).toBe(45_200_000);
    expect(convertedDeduction(100_000_000)).toBe(45_200_000 + 30_000_000 * 0.55); // 61,700,000
    expect(convertedDeduction(100_000_000)).toBe(61_700_000);
    expect(convertedDeduction(300_000_000)).toBe(61_700_000 + 200_000_000 * 0.45); // 151,700,000
    expect(convertedDeduction(300_000_000)).toBe(151_700_000);
  });
});

describe('기본세율 — 누진공제 방식', () => {
  it('구간별 세액', () => {
    expect(basicTax(0)).toBe(0);
    expect(basicTax(14_000_000)).toBe(14_000_000 * 0.06);
    expect(basicTax(50_000_000)).toBe(50_000_000 * 0.15 - 1_260_000);
    expect(basicTax(88_000_000)).toBe(88_000_000 * 0.24 - 5_760_000);
    expect(basicTax(300_000_000)).toBe(300_000_000 * 0.38 - 19_940_000);
  });

  it('구간 경계에서 이어진다 (누진공제가 맞아야 연속이다)', () => {
    for (const edge of [14_000_000, 50_000_000, 88_000_000, 150_000_000, 300_000_000, 500_000_000, 1_000_000_000]) {
      expect(basicTax(edge + 1) - basicTax(edge)).toBeLessThan(1);
    }
  });
});

describe('퇴직소득세 통합', () => {
  it('근속연수공제보다 퇴직급여가 적으면 세금이 0', () => {
    const r = computeSeveranceTax(3_000_000, 2009); // 6년 → 공제 700만
    expect(r.taxBase).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.netSeverance).toBe(3_000_000);
  });

  it('환산급여가 800만 원 이하면 전액 공제되어 세금이 0', () => {
    // 1년 근속, 퇴직급여 1,600,000 → 공제 100만 → 환산급여 (60만×12) = 720만
    const r = computeSeveranceTax(1_600_000, 365);
    expect(r.years).toBe(1);
    expect(r.converted).toBe(7_200_000);
    expect(r.taxBase).toBe(0);
    expect(r.totalTax).toBe(0);
  });

  it('지방소득세는 소득세의 10%, 10원 미만 절사', () => {
    const r = computeSeveranceTax(20_057_096, 2009);
    expect(r.localTax).toBe(Math.floor((r.incomeTax * 0.1) / 10) * 10);
  });

  it('세후 퇴직금 = 퇴직급여 − 원천징수 세액 합계', () => {
    const r = computeSeveranceTax(20_057_096, 2009);
    expect(r.netSeverance).toBe(20_057_096 - r.totalTax);
  });

  it('퇴직급여가 늘면 세금도 줄지 않는다', () => {
    let prev = -1;
    for (let s = 0; s <= 500_000_000; s += 1_000_000) {
      const t = computeSeveranceTax(s, 3650).totalTax;
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });
});
