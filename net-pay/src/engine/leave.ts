/** 연차수당 — docs/FUNCTIONAL_SPEC.md §3-12 (CE-9) */
import type { LeavePayInput, LeavePayResult } from '@/types';
import { ORDINARY_HOURS_PER_DAY } from '@/constants';
import { floor1 } from './money';

/**
 * 연차수당 = 1일 통상임금 × 미사용 연차 일수
 * 1일 통상임금 = (월 통상임금 ÷ 월 소정근로시간) × 8시간
 */
export function computeLeavePay(input: LeavePayInput): LeavePayResult {
  const hours = input.monthlyHours > 0 ? input.monthlyHours : 1;
  const hourly = floor1(Math.max(0, input.monthlyOrdinary) / hours);
  const daily = hourly * ORDINARY_HOURS_PER_DAY;
  const pay = floor1(daily * Math.max(0, input.unusedDays));
  return { hourly, daily, pay };
}
