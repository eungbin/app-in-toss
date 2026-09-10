/** 재취업 시점별 총 수령액 — S03 (§3-9) */
import type { CurvePoint } from '../types';
import { earlyBonus } from './early';

/**
 * day = 수급 시작 후 n일째 재취업. 그날까지 n일분을 받고, 남은 일수로 조기재취업수당을 본다.
 * 신고일 경과 요건(14일)은 수급 시작 시점을 기준으로 이미 지난 것으로 본다 —
 * 대기기간 7일이 신고일부터 계산되므로 수급 시작은 신고 후 8일째다.
 */
export function curve(benefitDaily: number, benefitDays: number): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (let day = 0; day <= benefitDays; day++) {
    const remaining = benefitDays - day;
    const bonus = earlyBonus(benefitDaily, benefitDays, remaining, day + 8);
    const paid = benefitDaily * day;
    points.push({ day, paid, bonus: bonus.amount, total: paid + bonus.amount });
  }
  return points;
}
