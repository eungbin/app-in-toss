/** 테스트용 최소 데이터 — 실제 번들 데이터와 무관하게 계산 규칙만 검증한다 */
import type { CalcOptions, RatesFile, TaxTableFile } from '@/types';

export const RATES: RatesFile = [
  {
    from: '2025-01-01',
    nps: { totalRate: 0.09, employeeShare: 0.5, baseMin: 400_000, baseMax: 6_370_000 },
    nhis: {
      totalRate: 0.0709,
      employeeShare: 0.5,
      ltcRateOnPremium: 0.1295,
      premiumMin: null,
      premiumMax: null,
    },
    ei: { totalRate: 0.009, employeeShare: 1 },
    sources: [],
  },
  {
    from: '2026-01-01',
    nps: { totalRate: 0.095, employeeShare: 0.5, baseMin: 410_000, baseMax: 6_590_000 },
    nhis: {
      totalRate: 0.0719,
      employeeShare: 0.5,
      ltcRateOnPremium: 0.1314,
      premiumMin: 20_160,
      premiumMax: 9_183_480,
    },
    ei: { totalRate: 0.009, employeeShare: 1 },
    sources: [],
  },
];

/** 1,000,000 ~ 1,030,000 구간만 있는 축소 표. 가족 수가 늘수록 세액이 준다 */
export const TABLE: TaxTableFile = {
  meta: {
    source: 'test',
    effectiveFrom: '2026-03-01',
    fetchedAt: '2026-09-07',
    url: '',
    license: 'test',
  },
  brackets: [
    { lo: 1_000_000, hi: 1_010_000, tax: [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 0] },
    { lo: 1_010_000, hi: 1_020_000, tax: [2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000] },
    { lo: 1_020_000, hi: 1_030_000, tax: [3000, 2900, 2800, 2700, 2600, 2500, 2400, 2300, 2200, 2100, 2000] },
  ],
  childDeduction: { one: 20_830, two: 45_830, extraPerChild: 33_330 },
  overCap: {
    verified: true,
    // 1,030,000 초과부터: 구간별 (초과분 × 0.98 × rate)
    segments: [
      { from: 1_030_000, to: 2_000_000, add: 500, factor: 0.98, rate: 0.1 },
      { from: 2_000_000, to: null, add: 0, factor: 0.98, rate: 0.2 },
    ],
  },
};

/** 과거 시행판이 없는 상태를 만들기 위해 하나만 담는다 */
export const TABLES: TaxTableFile[] = [TABLE];

export const DATA = { rates: RATES, tables: TABLES };

export function opts(over: Partial<CalcOptions> = {}): CalcOptions {
  return {
    dependents: 1,
    children: 0,
    nonTaxableMonthly: 0,
    taxRatio: 1,
    asOf: '2026-09-07',
    ...over,
  };
}
