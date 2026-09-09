/**
 * 일급 (CE-2) — docs/FUNCTIONAL_SPEC.md §3-3
 *
 * 가산수당(연장·야간·휴일)은 **상시 5명 이상 사업장에만** 적용된다.
 * 근로기준법 제11조 제2항과 시행령 별표 1이 4명 이하 사업장에 적용하는 규정을 열거하는데,
 * 제4장에서는 제54조(휴게)·제55조 제1항(주휴일)·제63조만 들어 있고 제56조는 없다.
 * 그래서 5인 미만은 통상시급 × 시간만 나온다. 시간 자체는 화면에 참고로 보여 준다.
 */
import type { DayPay, LegalFile, ShiftSplit, WorkRecord, Workplace } from '@/types';
import { LEGAL } from '@/data';

/** 분 × 시급 × 배수 → 원 (마지막에 절사) */
function payFor(minutes: number, hourlyWage: number, multiplier: number): number {
  return Math.floor((minutes * hourlyWage * multiplier) / 60);
}

export function dayPay(
  split: ShiftSplit,
  rec: Pick<WorkRecord, 'extraPay'>,
  wp: Pick<Workplace, 'hourlyWage' | 'fivePlus'>,
  legal: LegalFile = LEGAL,
): DayPay {
  const wage = Math.max(0, Math.floor(wp.hourlyWage));
  const base = payFor(split.work, wage, 1);

  let overtimePay = 0;
  let nightPay = 0;
  let holidayPay = 0;
  if (wp.fivePlus) {
    overtimePay = payFor(split.overtime, wage, legal.rates.overtime);
    nightPay = payFor(split.night, wage, legal.rates.night);
    holidayPay =
      payFor(split.holidayIn8, wage, legal.rates.holidayIn8) +
      payFor(split.holidayOver8, wage, legal.rates.holidayOver8);
  }

  const extra = Math.max(0, Math.floor(rec.extraPay));
  return {
    base,
    overtimePay,
    nightPay,
    holidayPay,
    extra,
    total: base + overtimePay + nightPay + holidayPay + extra,
  };
}
