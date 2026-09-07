/**
 * 일일 무료 플레이 — docs/FUNCTIONAL_SPEC.md §3-7 (MZ-1)
 */
import type { Quota } from '@/types';
import { AD_BONUS_CAP, FREE_PLAYS_PER_DAY } from '@/constants';

/** 로컬 날짜 YYYY-MM-DD */
export function localDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const emptyQuota = (today: string): Quota => ({ date: today, used: 0, bonus: 0 });

/** 날짜가 바뀌었으면 used만 초기화. bonus는 유지 */
export function rollover(q: Quota, today: string): Quota {
  return q.date === today ? q : { date: today, used: 0, bonus: q.bonus };
}

/** 남은 플레이 수. 프리미엄은 Infinity */
export function available(q: Quota, premium: boolean): number {
  if (premium) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_PLAYS_PER_DAY - q.used) + q.bonus;
}

/** 판 시작 시 차감. 무료분 먼저, 없으면 bonus */
export function consume(q: Quota, premium: boolean): Quota | null {
  if (premium) return q;
  if (q.used < FREE_PLAYS_PER_DAY) return { ...q, used: q.used + 1 };
  if (q.bonus > 0) return { ...q, bonus: q.bonus - 1 };
  return null;
}

/** 리워드 광고 시청 완료 — userEarnedReward에서만 호출 */
export function grantBonus(q: Quota): Quota {
  return { ...q, bonus: Math.min(q.bonus + 1, AD_BONUS_CAP) };
}
