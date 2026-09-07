/** 게이트 해제 — docs/FUNCTIONAL_SPEC.md §3-8 (MZ-1) */
import type { Unlock } from '@/types';

/** 게이트가 걸린 기능 */
export type GateFeature = 'timeline' | 'compare' | 'saveExtra';

/** 기기 로컬 시간 기준 다음 자정 */
export function nextMidnight(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

export const emptyUnlock: Unlock = { until: null };

export function isUnlocked(unlock: Unlock, now: number): boolean {
  return unlock.until !== null && now < unlock.until;
}

/** 광고 시청 보상 — 오늘 자정까지 전체 게이트를 연다 */
export function unlockUntilMidnight(now: number): Unlock {
  return { until: nextMidnight(now) };
}
