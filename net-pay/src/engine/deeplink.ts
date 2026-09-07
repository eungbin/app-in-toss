/**
 * 딥링크 — docs/FUNCTIONAL_SPEC.md §2 (US-3)
 * `intoss://net-pay/r?net=…` 역산, `/g?gross=…` 정방향.
 * 잘못된 값은 그 파라미터만 무시한다(앱은 빈 폼으로 정상 시작).
 */
import { CHILDREN_MAX, DEPENDENTS_MAX, DEPENDENTS_MIN, NONTAX_MEAL_DEFAULT } from '@/constants';
import type { CalcMode } from '@/types';

export const APP_NAME = 'net-pay';

export interface DeepLinkInput {
  mode: CalcMode;
  /** 원 단위 */
  amount: number | null;
  dependents: number | null;
  children: number | null;
  nonTaxableMonthly: number | null;
}

function intIn(raw: string | null, min: number, max: number): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const v = Number(raw);
  return v >= min && v <= max ? v : null;
}

/** 경로와 쿼리에서 입력값을 읽는다. 해당 없으면 null */
export function parseDeepLink(pathname: string, search: string): DeepLinkInput | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const isReverse = path === '/r';
  const isForward = path === '/g';
  if (!isReverse && !isForward) return null;

  const q = new URLSearchParams(search);
  const amountKey = isReverse ? 'net' : 'gross';
  return {
    mode: isReverse ? 'reverse' : 'forward',
    amount: intIn(q.get(amountKey), 1, 100_000_000_000),
    dependents: intIn(q.get('dep'), DEPENDENTS_MIN, DEPENDENTS_MAX),
    children: intIn(q.get('kids'), 0, CHILDREN_MAX),
    nonTaxableMonthly: intIn(q.get('nt'), 0, 10_000_000),
  };
}

export interface BuildLinkArgs {
  mode: CalcMode;
  amount: number;
  dependents: number;
  children: number;
  nonTaxableMonthly: number;
}

/** 공유 카드에 넣을 경로. 기본값과 같은 항목은 붙이지 않는다 */
export function buildDeepLinkPath(a: BuildLinkArgs): string {
  const q = new URLSearchParams();
  q.set(a.mode === 'reverse' ? 'net' : 'gross', String(Math.round(a.amount)));
  if (a.dependents !== DEPENDENTS_MIN) q.set('dep', String(a.dependents));
  if (a.children !== 0) q.set('kids', String(a.children));
  if (a.nonTaxableMonthly !== NONTAX_MEAL_DEFAULT) q.set('nt', String(a.nonTaxableMonthly));
  return `/${a.mode === 'reverse' ? 'r' : 'g'}?${q.toString()}`;
}
