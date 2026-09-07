/**
 * 개발용 간이세액 근사 산식.
 *
 * 실제 간이세액표(소득세법 시행령 별표2)는 국세청이 배포하는 파일에서 받아야 한다.
 * 이 파일은 표를 받기 전에도 앱을 돌려볼 수 있도록, 소득세법의 계산 흐름
 * (근로소득공제 → 인적·연금·특별공제 → 기본세율 → 근로소득세액공제)을
 * **근사**해 구조가 같은 표를 만든다. 실제 표와 값이 다르므로 프로덕션 빌드에서는 차단된다.
 */

/** 근로소득공제 (한도 2,000만 원) */
export function earnedIncomeDeduction(annual: number): number {
  let d: number;
  if (annual <= 5_000_000) d = annual * 0.7;
  else if (annual <= 15_000_000) d = 3_500_000 + (annual - 5_000_000) * 0.4;
  else if (annual <= 45_000_000) d = 7_500_000 + (annual - 15_000_000) * 0.15;
  else if (annual <= 100_000_000) d = 12_000_000 + (annual - 45_000_000) * 0.05;
  else d = 14_750_000 + (annual - 100_000_000) * 0.02;
  return Math.min(d, 20_000_000);
}

/** 종합소득 기본세율 (2023 개정 이후) */
export function basicTax(base: number): number {
  if (base <= 14_000_000) return base * 0.06;
  if (base <= 50_000_000) return 840_000 + (base - 14_000_000) * 0.15;
  if (base <= 88_000_000) return 6_240_000 + (base - 50_000_000) * 0.24;
  if (base <= 150_000_000) return 15_360_000 + (base - 88_000_000) * 0.35;
  if (base <= 300_000_000) return 37_060_000 + (base - 150_000_000) * 0.38;
  if (base <= 500_000_000) return 94_060_000 + (base - 300_000_000) * 0.4;
  if (base <= 1_000_000_000) return 174_060_000 + (base - 500_000_000) * 0.42;
  return 384_060_000 + (base - 1_000_000_000) * 0.45;
}

/** 근로소득세액공제 */
export function earnedIncomeTaxCredit(computed: number, annual: number): number {
  const raw = computed <= 1_300_000 ? computed * 0.55 : 715_000 + (computed - 1_300_000) * 0.3;
  let cap: number;
  if (annual <= 33_000_000) cap = 740_000;
  else if (annual <= 70_000_000) cap = Math.max(660_000, 740_000 - (annual - 33_000_000) * 0.008);
  else if (annual <= 120_000_000) cap = Math.max(500_000, 660_000 - (annual - 70_000_000) * 0.5 * 0.008);
  else cap = 200_000;
  return Math.min(raw, cap);
}

/** 특별소득공제·특별세액공제 근사 (실제 표는 총급여 구간별 산식을 쓴다) */
export function specialDeduction(annual: number): number {
  return Math.min(Math.max(annual * 0.1, 3_100_000), 15_000_000);
}

/**
 * 월 과세급여·공제대상가족 수 → 월 간이세액(근사, 자녀 차감 전).
 * 반환값은 절사 전 실수.
 */
export function devMonthlyTax(taxableMonthly: number, dependents: number): number {
  const annual = taxableMonthly * 12;
  const incomeAmount = annual - earnedIncomeDeduction(annual);
  const personal = 1_500_000 * dependents;
  const pension = annual * 0.045;
  const base = Math.max(0, incomeAmount - personal - pension - specialDeduction(annual));
  const computed = basicTax(base);
  const determined = Math.max(0, computed - earnedIncomeTaxCredit(computed, annual));
  return determined / 12;
}
