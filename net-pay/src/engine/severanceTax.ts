/**
 * 퇴직소득세 — docs/FUNCTIONAL_SPEC.md §3-11 (CE-10)
 *
 * 소득세법 제48조·제55조. 퇴직금은 여러 해에 걸쳐 쌓인 소득이라 한꺼번에 받으면
 * 누진세율이 과도하게 걸린다. 그래서 1년치로 환산해 세율을 적용한 뒤 다시 근속연수를 곱한다.
 *
 *   퇴직소득금액 − 근속연수공제 → ×12÷근속연수 → 환산급여
 *   환산급여 − 환산급여공제 → 과세표준
 *   과세표준 × 세율 − 누진공제 → ÷12×근속연수 → 산출세액
 *
 * 산식·구간은 국세청 「퇴직소득세 계산방법」(2023-01-01 개정 근속연수공제 반영) 기준.
 */

/** 근속연수공제 — 국세청 표 */
export function yearsDeduction(years: number): number {
  if (years <= 5) return years * 1_000_000;
  if (years <= 10) return 5_000_000 + (years - 5) * 2_000_000;
  if (years <= 20) return 15_000_000 + (years - 10) * 2_500_000;
  return 40_000_000 + (years - 20) * 3_000_000;
}

/** 환산급여공제 — 국세청 표 */
export function convertedDeduction(converted: number): number {
  if (converted <= 8_000_000) return converted;
  if (converted <= 70_000_000) return 8_000_000 + (converted - 8_000_000) * 0.6;
  if (converted <= 100_000_000) return 45_200_000 + (converted - 70_000_000) * 0.55;
  if (converted <= 300_000_000) return 61_700_000 + (converted - 100_000_000) * 0.45;
  return 151_700_000 + (converted - 300_000_000) * 0.35;
}

/** 종합소득 기본세율 — 세율과 누진공제 */
const BRACKETS: { upTo: number; rate: number; progressive: number }[] = [
  { upTo: 14_000_000, rate: 0.06, progressive: 0 },
  { upTo: 50_000_000, rate: 0.15, progressive: 1_260_000 },
  { upTo: 88_000_000, rate: 0.24, progressive: 5_760_000 },
  { upTo: 150_000_000, rate: 0.35, progressive: 15_440_000 },
  { upTo: 300_000_000, rate: 0.38, progressive: 19_940_000 },
  { upTo: 500_000_000, rate: 0.4, progressive: 25_940_000 },
  { upTo: 1_000_000_000, rate: 0.42, progressive: 35_940_000 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.45, progressive: 65_940_000 },
];

export function basicTax(taxBase: number): number {
  if (taxBase <= 0) return 0;
  const b = BRACKETS.find((x) => taxBase <= x.upTo) as (typeof BRACKETS)[number];
  return Math.max(0, taxBase * b.rate - b.progressive);
}

/**
 * 근속연수 — 재직일수를 연 단위로. **1년 미만의 기간은 1년으로 본다**(소득세법 제48조).
 * 5년 6개월이면 6년이다.
 */
export function serviceYears(days: number): number {
  return Math.max(1, Math.ceil(days / 365));
}

export interface SeveranceTaxResult {
  years: number;
  yearsDeduction: number;
  /** 환산급여 */
  converted: number;
  convertedDeduction: number;
  taxBase: number;
  /** 퇴직소득 산출세액 */
  incomeTax: number;
  localTax: number;
  totalTax: number;
  /** 세후 퇴직금 */
  netSeverance: number;
}

/** 10원 미만 절사 */
const floor10 = (n: number) => Math.floor(n / 10) * 10;

/**
 * 퇴직급여와 재직일수로 퇴직소득세를 계산한다.
 * 퇴직급여가 근속연수공제보다 적으면 세금은 0이다.
 */
export function computeSeveranceTax(severance: number, days: number): SeveranceTaxResult {
  const years = serviceYears(days);
  const yd = yearsDeduction(years);
  const base = Math.max(0, severance - yd);
  const converted = (base * 12) / years;
  const cd = convertedDeduction(converted);
  const taxBase = Math.max(0, converted - cd);
  const incomeTax = floor10((basicTax(taxBase) / 12) * years);
  const localTax = floor10(incomeTax * 0.1);
  const totalTax = incomeTax + localTax;

  return {
    years,
    yearsDeduction: yd,
    converted,
    convertedDeduction: cd,
    taxBase,
    incomeTax,
    localTax,
    totalTax,
    netSeverance: severance - totalTax,
  };
}
