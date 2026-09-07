/**
 * 역산 — docs/FUNCTIONAL_SPEC.md §3-4 (CE-6). 서비스의 메인 훅.
 *
 * 정방향(연봉 → 실수령)은 **단조 증가가 아니다.** 간이세액표가 월 과세급여
 * 10,000원 단위 계단이고 국민연금 기준소득월액이 1,000원 단위로 절사되기 때문에,
 * 연봉이 조금 오르는 순간 실수령이 잠깐 내려가는 지점이 생긴다(측정: 최대 월 2,417원).
 * 그래서 단순 이진 탐색을 쓰면 목표에 못 미치는 연봉을 답으로 내놓을 수 있다.
 *
 * 대신 두 단계로 찾는다.
 *  1) 세액표 구간 폭(연봉 120,000원)에 맞춘 격자 위에서 이진 탐색한다.
 *     격자 한 칸에서 세전은 월 10,000원 늘고 공제는 많아야 약 3,700원 느는 것이
 *     보장되므로, 격자 위에서는 단조 증가다.
 *  2) 찾은 칸 안을 훑어 목표를 만족하는 가장 낮은 연봉을 고른다.
 *     그 뒤 남은 구간에 목표 아래로 떨어지는 지점이 있으면 그 뒤로 옮긴다.
 *
 * 예외 구간: 과세 월급이 0원에서 막 생길 때는 국민연금·건강보험 **하한**이 한꺼번에
 * 걸려 실수령이 한 번 크게 떨어진다(제도상 계단). 최저임금에 한참 못 미치는
 * 연봉에서만 일어나므로 격자 탐색의 전제는 실사용 구간에서 성립한다.
 */
import type { CalcOptions, ReverseResult } from '@/types';
import { GROSS_MAX } from '@/constants';
import { computeNet, netMonthlyOf, type EngineData, BUNDLED } from './net';
import { ceilTo10k } from './money';

/** 세액표 구간 폭(월 과세 10,000원)에 대응하는 연봉 격자 */
const GRID = 120_000;
/** 연봉 12원 = 월 1원. 최소 해상도 */
const STEP = 12;

function result(
  target: number,
  annualGross: number,
  outOfRange: boolean,
  opts: CalcOptions,
  data: EngineData,
): ReverseResult {
  const breakdown = computeNet(annualGross, opts, data);
  return {
    target,
    annualGross,
    annualGrossDisplay: ceilTo10k(annualGross),
    achievedNet: breakdown.netMonthly,
    outOfRange,
    breakdown,
  };
}

export function computeGross(
  targetNet: number,
  opts: CalcOptions,
  data: EngineData = BUNDLED,
): ReverseResult {
  const target = Math.max(0, Math.floor(targetNet));
  if (target === 0) return result(target, 0, false, opts, data);

  const net = (g: number) => netMonthlyOf(g, opts, data);
  if (net(GROSS_MAX) < target) return result(target, GROSS_MAX, true, opts, data);

  // 1) 격자 이진 탐색 — 불변식: net(lo) < target <= net(hi), 둘 다 격자점
  let lo = 0;
  let hi = Math.ceil(GROSS_MAX / GRID) * GRID;
  if (net(0) >= target) return result(target, 0, false, opts, data);
  while (hi - lo > GRID) {
    const mid = Math.floor((lo + hi) / (2 * GRID)) * GRID;
    if (mid <= lo || mid >= hi) break;
    if (net(mid) >= target) hi = mid;
    else lo = mid;
  }

  // 2) 칸 안에서 목표를 만족하는 가장 낮은 연봉
  let answer = hi;
  for (let g = lo; g <= hi; g += STEP) {
    if (net(g) >= target) {
      answer = g;
      break;
    }
  }

  // 3) 답 이후에 목표 아래로 내려가는 지점이 있으면 그 뒤로 옮긴다.
  //    hi는 격자점이라 net(hi) >= target 이 보장되므로 반드시 끝난다.
  for (let g = answer; g <= hi; g += STEP) {
    if (net(g) < target) answer = g + STEP;
  }

  return result(target, Math.min(answer, hi), false, opts, data);
}
