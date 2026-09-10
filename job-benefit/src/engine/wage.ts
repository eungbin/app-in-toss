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

/** 기초일액 — 법 제45조 ① → ② → ⑤ → ④ */
export function baseDaily(
  average: number,
  minBase: number,
  ordinaryDaily?: number,
): BaseDailyResult {
  const applied: Applied[] = [];
  let b = average;

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
  benefitDaily: number;
  applied: Applied[];
}

/** 구직급여일액 — 법 제46조 ① → ② */
export function benefitDaily(
  base: number,
  minBase: number,
  baseApplied: readonly Applied[],
): BenefitDailyResult {
  const applied = [...baseApplied];
  const minDaily = minBase * legal.rateMin; // 최저구직급여일액

  // ①2 최저기초일액이 적용된 경우
  if (baseApplied.includes('minBase')) {
    return { benefitDaily: Math.floor(minDaily), applied };
  }
  // ①1 그 밖의 경우
  let daily = base * legal.rateNormal;
  // ② 최저구직급여일액보다 낮으면 그 값
  if (daily < minDaily) {
    daily = minDaily;
    applied.push('minDaily');
  }
  return { benefitDaily: Math.floor(daily), applied };
}
