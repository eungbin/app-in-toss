/**
 * 역산 — docs/FUNCTIONAL_SPEC.md §3-4 (CE-6). 서비스의 메인 훅.
 *
 * 정방향(연봉 → 실수령)은 **단조 증가가 아니다.** 실제 간이세액표로 측정한 결과
 * 연봉이 12원(월 1원) 오를 때 실수령이 최대 **월 27,499원** 떨어지는 지점이 있다
 * (연봉 122,400,012원 = 과세 월급이 표 상한 1,000만 원을 넘는 지점. 별표2의 초과 산식이
 * 상한 기준 세액에 25,000원을 더하면서 생긴다). 세액표 구간 계단과 국민연금
 * 기준소득월액 천 원 절사도 작은 하락을 만든다.
 *
 * 그래서 두 단계로 찾는다.
 *  1) 연봉 120만 원 격자에서 이진 탐색한다. 격자 한 칸에서 세전은 월 10만 원 늘어
 *     어떤 공제 단차보다도 크므로 격자 위에서는 단조 증가다(테스트로 검증).
 *  2) 찾은 칸 안을 12원 간격으로 훑어 목표를 만족하는 **최소 연봉**을 고른다.
 *
 * 마지막으로 화면에 내보내는 만 원 단위 연봉(annualGrossDisplay)에서도 목표가
 * 지켜지는지 따로 확인한다. 최소 연봉과 표시 연봉 사이에 위 계단이 끼면
 * 표시 연봉의 실수령이 목표보다 낮아질 수 있기 때문이다.
 */
import type { CalcOptions, ReverseResult } from '@/types';
import { GROSS_MAX, REVERSE_GRID } from '@/constants';
import { computeNet, netMonthlyOf, type EngineData, BUNDLED } from './net';

const GRID = REVERSE_GRID;
/** 연봉 12원 = 월 1원. 최소 해상도 */
const STEP = 12;
/** 표시 연봉을 올릴 때의 단위 */
const DISPLAY_UNIT = 10_000;
/** 표시 연봉 보정 시도 한도 (계단 폭 27,499원 → 만 원 단위로 몇 칸이면 충분하다) */
const DISPLAY_BUMPS = 8;

export function computeGross(
  targetNet: number,
  opts: CalcOptions,
  data: EngineData = BUNDLED,
): ReverseResult {
  const target = Math.max(0, Math.floor(targetNet));
  const net = (g: number) => netMonthlyOf(g, opts, data);

  const finish = (annualGross: number, outOfRange: boolean): ReverseResult => {
    // 표시 연봉은 만 원 단위로 올리되, 그 연봉에서도 목표가 지켜지는 값까지 올린다
    let display = Math.ceil(annualGross / DISPLAY_UNIT) * DISPLAY_UNIT;
    if (!outOfRange && target > 0) {
      for (let i = 0; i < DISPLAY_BUMPS && net(display) < target; i++) display += DISPLAY_UNIT;
    }
    return {
      target,
      annualGross,
      annualGrossDisplay: display,
      achievedNet: net(display),
      outOfRange,
      breakdown: computeNet(display, opts, data),
    };
  };

  if (target === 0) return finish(0, false);
  if (net(GROSS_MAX) < target) return finish(GROSS_MAX, true);
  if (net(0) >= target) return finish(0, false);

  // 1) 격자 이진 탐색 — 불변식: net(lo) < target <= net(hi), 둘 다 격자점
  let lo = 0;
  let hi = Math.ceil(GROSS_MAX / GRID) * GRID;
  while (hi - lo > GRID) {
    const mid = Math.round((lo + hi) / (2 * GRID)) * GRID;
    if (mid <= lo || mid >= hi) break;
    if (net(mid) >= target) hi = mid;
    else lo = mid;
  }

  // 2) 칸 안에서 목표를 만족하는 최소 연봉
  for (let g = lo; g < hi; g += STEP) {
    if (net(g) >= target) return finish(g, false);
  }
  return finish(hi, false);
}
