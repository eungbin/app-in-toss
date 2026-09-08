/**
 * 딥링크 — docs/FUNCTIONAL_SPEC.md §2 (US-3)
 * `intoss://rent-calc/j?m=renew&cd=…&cr=…&pd=…&pr=…`
 * 잘못된 값은 그 파라미터만 무시한다(앱은 빈 폼으로 정상 시작).
 */
import type { Mode } from '@/types';

export const APP_NAME = 'rent-calc';

/** 보증금 상한 — 1,000억. 오타로 들어온 거대한 값을 막는다 */
const AMOUNT_MAX = 100_000_000_000;

export interface DeepLinkInput {
  mode: Mode;
  /** 원 단위. 없으면 null */
  currentDeposit: number | null;
  currentRent: number | null;
  proposedDeposit: number | null;
  proposedRent: number | null;
}

function amount(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const v = Number(raw);
  return v >= 0 && v <= AMOUNT_MAX ? v : null;
}

export function parseDeepLink(pathname: string, search: string): DeepLinkInput | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path !== '/j') return null;

  const q = new URLSearchParams(search);
  return {
    mode: q.get('m') === 'new' ? 'new' : 'renew',
    currentDeposit: amount(q.get('cd')),
    currentRent: amount(q.get('cr')),
    proposedDeposit: amount(q.get('pd')),
    proposedRent: amount(q.get('pr')),
  };
}

export interface BuildLinkArgs {
  mode: Mode;
  currentDeposit: number;
  currentRent: number;
  proposedDeposit: number;
  proposedRent: number;
}

/** 공유 카드에 넣을 경로. 신규 계약은 현재 조건을 붙이지 않는다 */
export function buildDeepLinkPath(a: BuildLinkArgs): string {
  const q = new URLSearchParams();
  q.set('m', a.mode);
  if (a.mode === 'renew') {
    q.set('cd', String(Math.round(a.currentDeposit)));
    q.set('cr', String(Math.round(a.currentRent)));
  }
  q.set('pd', String(Math.round(a.proposedDeposit)));
  q.set('pr', String(Math.round(a.proposedRent)));
  return `/j?${q.toString()}`;
}
