/** 퇴직금 — docs/FUNCTIONAL_SPEC.md §3-11 (CE-8) */
import type { SeveranceInput, SeveranceResult } from '@/types';
import { floor1 } from './money';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" → UTC epoch ms. 시간대·서머타임 영향을 받지 않는다 */
export function parseDate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return toIso(parseDate(iso) + n * DAY_MS);
}

/** iso로부터 n개월 전 날짜. 말일 보정(3-31 −1개월 = 2-28/29) */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const year = y ?? 1970;
  const month = (m ?? 1) - 1 + n;
  const day = d ?? 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return toIso(Date.UTC(year, month, Math.min(day, lastDay)));
}

export function diffDays(fromIso: string, toIso_: string): number {
  return Math.round((parseDate(toIso_) - parseDate(fromIso)) / DAY_MS);
}

/**
 * 퇴직금 = 1일 평균임금 × 30 × (재직일수 ÷ 365)
 * 1일 평균임금 = (퇴직 전 3개월 임금 + 연간 상여 × 3/12 + 연차수당 × 3/12) ÷ 그 기간의 일수
 * 평균임금이 통상임금보다 적으면 통상임금을 쓴다(근로기준법 제2조 제2항).
 */
export function computeSeverance(input: SeveranceInput): SeveranceResult {
  // 퇴사일 = 마지막 근무일의 다음 날
  const leaveDate = addDays(input.lastWorkDate, 1);
  const days = Math.max(0, diffDays(input.joinDate, leaveDate));

  // 평균임금 산정 기간: 퇴사일 직전 3개월
  const period3mStart = addMonths(leaveDate, -3);
  const period3mDays = Math.max(1, diffDays(period3mStart, leaveDate));

  const total =
    Math.max(0, input.wages3m) +
    (Math.max(0, input.annualBonus) * 3) / 12 +
    (Math.max(0, input.annualLeavePay) * 3) / 12;

  let avgDaily = floor1(total / period3mDays);
  let usedOrdinary = false;
  if (input.ordinaryDaily !== null && input.ordinaryDaily > avgDaily) {
    avgDaily = Math.floor(input.ordinaryDaily);
    usedOrdinary = true;
  }

  const underOneYear = days < 365;
  const severance = underOneYear ? 0 : floor1((avgDaily * 30 * days) / 365);

  // 재직 기간 표기 (년 / 개월 / 일)
  const years = Math.floor(days / 365);
  const afterYears = days - years * 365;
  const months = Math.floor(afterYears / 30);
  const restDays = afterYears - months * 30;

  return { days, years, months, restDays, period3mDays, avgDaily, usedOrdinary, severance, underOneYear };
}
