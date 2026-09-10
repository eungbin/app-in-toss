/** 임금일액 — 고용보험법 제45조·제46조 (§3-2 ~ §3-4)
 *
 * 조문 순서를 그대로 따라 단계마다 나눠 계산한다. 하나의 산식으로 압축하면
 * 부동소수 오차가 경계에서 튄다(work-journal 2026-09-10). */
import legal from '../data/legal.json';
import minWageFile from '../data/min-wage.json';
import type { Applied } from '../types';

export function averageDaily(wageTotal3m: number, days: number): number {
  if (days <= 0) throw new Error('산정 기간 일수가 0 이하입니다');
  return wageTotal3m / days;
}

export function minWageOf(year: number): number {
  const row = minWageFile.minWage.find((r) => r.year === year);
  if (!row) throw new Error(`${year}년 최저임금이 데이터에 없습니다`);
  return row.hourly;
}

/** 최저기초일액 — 법 제45조④ */
export const minBaseDaily = (stdDayHours: number, hourlyMinWage: number): number =>
  stdDayHours * hourlyMinWage;

export interface BaseDailyResult {
  baseDaily: number;
  applied: Applied[];
}

/**
 * 기초일액 — 법 제45조 ① → ② → ⑤ → ④
 *
 * **평균임금을 원 단위로 버린 뒤 시작한다.** 원문에 절사 규정은 없지만 고용보험 모의계산이
 * 그렇게 계산한다 — 평균 110,873.37 을 110,873 으로 보고 60% 를 적용해 66,523 을 냈다
 * (2026-09-11 대조, docs/FACT_CHECK.md 3장). 소수를 유지하면 66,524 로 1원이 어긋난다.
 */
export function baseDaily(
  average: number,
  minBase: number,
  ordinaryDaily?: number,
): BaseDailyResult {
  const applied: Applied[] = [];
  let b = Math.floor(average);

  // ② 평균임금이 통상임금보다 적으면 통상임금
  if (ordinaryDaily !== undefined && b < ordinaryDaily) {
    b = ordinaryDaily;
    applied.push('ordinary');
  }
  // ⑤ 상한 (시행령 제68조)
  if (b > legal.baseDailyCap) {
    b = legal.baseDailyCap;
    applied.push('cap');
  }
  // ④ 최저기초일액
  if (b < minBase) {
    b = minBase;
    applied.push('minBase');
  }
  return { baseDaily: b, applied };
}

export interface BenefitDailyResult {
  /** 화면에 쓰는 값 — 원 단위로 버린다 */
  benefitDaily: number;
  /** 버리기 전 값. 총액은 이 값으로 곱한다 (아래 설명) */
  exact: number;
  applied: Applied[];
}

/**
 * 구직급여일액 — 법 제46조 ① → ②
 *
 * 고용보험 모의계산을 대조해 알아낸 계산의 실체(2026-09-11, docs/FACT_CHECK.md 3장):
 *   기초일액 = 평균임금을 원 단위로 버림  → 절사가 여기 한 번 있다
 *   일액     = 기초일액 × 60%             → 소수를 유지한다
 *   표시     = 일액을 원 단위로 버림
 *   총액     = 버리기 전 일액 × 소정급여일수
 * 그래서 표시된 일액에 일수를 곱한 값과 총액이 최대 몇백 원 어긋난다. 관공서 화면이
 * 그렇게 나오므로 그쪽을 따른다 — 사용자가 두 값을 견주기 때문이다.
 */
export function benefitDaily(
  base: number,
  minBase: number,
  baseApplied: readonly Applied[],
): BenefitDailyResult {
  const applied = [...baseApplied];
  const minDaily = minBase * legal.rateMin; // 최저구직급여일액

  // ①2 최저기초일액이 적용된 경우
  if (baseApplied.includes('minBase')) {
    return { benefitDaily: Math.floor(minDaily), exact: minDaily, applied };
  }
  // ①1 그 밖의 경우
  let daily = base * legal.rateNormal;
  // ② 최저구직급여일액보다 낮으면 그 값
  if (daily < minDaily) {
    daily = minDaily;
    applied.push('minDaily');
  }
  return { benefitDaily: Math.floor(daily), exact: daily, applied };
}
