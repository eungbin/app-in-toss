/** 간이세액표 조회 — docs/FUNCTIONAL_SPEC.md §3-3 (CE-5) */
import type { TaxTableFile } from '@/types';
import { DEPENDENTS_MAX, DEPENDENTS_MIN } from '@/constants';
import { clamp } from './money';

/** 8세 이상 20세 이하 자녀 수별 차감액 */
export function childDeduction(table: TaxTableFile, children: number): number {
  const { one, two, extraPerChild } = table.childDeduction;
  if (children <= 0) return 0;
  if (children === 1) return one;
  if (children === 2) return two;
  return two + extraPerChild * (children - 2);
}

/** lo <= taxable < hi 인 행을 이진 탐색 */
function findBracket(table: TaxTableFile, taxable: number): number[] | null {
  const { brackets } = table;
  let lo = 0;
  let hi = brackets.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = brackets[mid];
    if (!b) return null;
    if (taxable < b.lo) hi = mid - 1;
    else if (taxable >= b.hi) lo = mid + 1;
    else return b.tax;
  }
  return null;
}

/** 표 상한(마지막 구간의 hi)을 넘는 급여의 세액 */
function overCapTax(table: TaxTableFile, taxable: number, col: number): number {
  const last = table.brackets[table.brackets.length - 1];
  if (!last) return 0;
  const baseTax = last.tax[col] ?? 0;
  let add = 0;
  for (const seg of table.overCap.segments) {
    // from 과 정확히 같을 때도 구간에 들어온 것으로 본다. add 는 표 마지막 구간과의 단차를 잇는 값이다
    if (taxable < seg.from) break;
    const upper = seg.to === null ? taxable : Math.min(taxable, seg.to);
    add += seg.add + (upper - seg.from) * seg.factor * seg.rate;
  }
  return baseTax + add;
}

/**
 * 월 과세급여·공제대상가족 수·자녀 수로 간이세액을 구한다.
 * 반환값은 절사 전 실수. 절사는 호출부(computeNet)에서 한다.
 */
export function lookupIncomeTax(
  table: TaxTableFile,
  taxableMonthly: number,
  dependents: number,
  children: number,
): number {
  const first = table.brackets[0];
  if (!first || taxableMonthly < first.lo) return 0;

  const col = clamp(Math.round(dependents), DEPENDENTS_MIN, DEPENDENTS_MAX) - 1;
  const row = findBracket(table, taxableMonthly);
  const gross = row ? (row[col] ?? 0) : overCapTax(table, taxableMonthly, col);

  return Math.max(0, gross - childDeduction(table, children));
}
