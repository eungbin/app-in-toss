/** 조기재취업 수당 — 고용보험법 제64조, 시행령 제84·85조 (§3-8) */
import legal from '../data/legal.json';
import type { EarlyBonus } from '../types';

/**
 * @param remainingDays 재취업일 전날 기준 남은 소정급여일수(= 미지급일수)
 * @param daysSinceReport 실업 신고일부터 재취업일까지의 일수
 *
 * "12개월 이상 계속 고용" 요건은 미래의 사실이라 계산에 넣을 수 없다.
 * 화면에서 조건으로 밝히고, 여기서는 충족을 전제한다(§3-8 AC-5).
 */
export function earlyBonus(
  benefitDaily: number,
  benefitDays: number,
  remainingDays: number,
  daysSinceReport: number,
): EarlyBonus {
  if (daysSinceReport <= legal.early.afterDays) {
    return { eligible: false, remainingDays, amount: 0, blockedBy: 'within14days' };
  }
  if (remainingDays < benefitDays * legal.early.remainRatio) {
    return { eligible: false, remainingDays, amount: 0, blockedBy: 'remainLessThanHalf' };
  }
  return {
    eligible: true,
    remainingDays,
    amount: Math.floor(benefitDaily * remainingDays * legal.early.rate),
  };
}
