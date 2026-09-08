/**
 * 법정 전환율과 환산 — docs/FUNCTIONAL_SPEC.md §3-2
 *
 * 주택임대차보호법 제7조의2: 보증금의 전부 또는 일부를 월 단위 차임으로 전환할 때
 * "연 1할"과 "기준금리 + 연 2%" 중 **낮은 비율**을 넘을 수 없다(시행령 제9조).
 */
import { CONVERSION_CEILING, CONVERSION_SPREAD } from '@/constants';
import type { Terms } from '@/types';
import { roundWon } from './money';

/**
 * 법정 전환율.
 *
 * 참고: 공공 계산기(한국부동산원·렌트홈)는 10% 상한을 적용하지 않고 언제나
 * `기준금리 + 산정률`을 쓴다. 기준금리 8% 이상에서만 갈리므로 현실적으로는
 * 차이가 없지만, 여기서는 법대로 상한을 적용한다(docs/FACT_CHECK.md R10).
 */
export function legalConversionRate(baseRate: number): number {
  return Math.min(CONVERSION_CEILING, baseRate + CONVERSION_SPREAD);
}

/** 보증금 → 월세 */
export function depositToRent(amount: number, rate: number): number {
  return roundWon((amount * rate) / 12);
}

/** 월세 → 보증금 */
export function rentToDeposit(rent: number, rate: number): number {
  return roundWon((rent * 12) / rate);
}

/**
 * 환산보증금 = 보증금 + 월세 × 12 ÷ 전환율.
 * 표시 전 단계이므로 반올림하지 않고 실수를 유지한다 — 인상률 계산의 분모가 된다.
 */
export function equivalentDeposit(terms: Terms, rate: number): number {
  if (terms.rent === 0) return terms.deposit;
  return terms.deposit + (terms.rent * 12) / rate;
}
