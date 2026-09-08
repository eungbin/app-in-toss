/**
 * 저장 게이트 — docs/FUNCTIONAL_SPEC.md §3-9
 *
 * 하루 3장 무료, 초과하면 리워드 광고. 자정에 초기화된다.
 *
 * 가장 중요한 규칙: **광고를 붙일 수 없으면 게이트를 연다.**
 * 광고 그룹 ID가 없거나 기기가 광고를 지원하지 않는데 저장이 막히면,
 * 사용자는 열 방법이 없는 문 앞에 서게 된다.
 */
import { SAVE_FREE_PER_DAY } from '@/constants';
import type { SaveGate } from '@/types';

export interface GateInput {
  savedToday: number;
  /** epoch ms. 이 시각 전까지 상한이 열려 있다 */
  gateOpenUntil: number | null;
  /** 광고를 붙일 수 있는 상태인가 (SDK 지원 + 그룹 ID 존재) */
  adsAvailable: boolean;
}

export function checkGate(input: GateInput, now: Date): SaveGate {
  if (!input.adsAvailable) return 'allow';
  if (input.gateOpenUntil !== null && now.getTime() < input.gateOpenUntil) return 'allow';
  if (input.savedToday < SAVE_FREE_PER_DAY) return 'allow';
  return 'gate';
}

/** 오늘 자정(다음 날 00:00) 타임스탬프 — 보상 유효 기한 */
export function midnightAfter(now: Date): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** 로컬 날짜 키. 날짜가 바뀌면 저장 횟수를 초기화한다 */
export function dateKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
