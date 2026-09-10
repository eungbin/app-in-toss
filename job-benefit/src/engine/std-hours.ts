/** 이직 전 1일 평균 소정근로시간 — 고용보험법 시행규칙 제91조의2 (§3-1) */
import legal from '../data/legal.json';
import type { StdHoursBasis } from '../types';

const { weekDiv, monthDiv, fourWeekDiv, dayHours } = legal.stdHours;

export function stdDayHours(basis: StdHoursBasis): number {
  switch (basis.kind) {
    case 'day':
      return basis.hours;
    case 'week':
      return ((basis.hours + basis.paidHolidayHours) / weekDiv) * dayHours;
    case 'month':
      return ((basis.hours + basis.paidHolidayHours) / monthDiv) * dayHours;
    case 'varies4w':
      return (basis.hours4w + basis.paidHolidayHours4w) / fourWeekDiv;
  }
}

/**
 * 주휴시간을 모르는 사용자를 위한 기본값 — 주 소정근로시간 ÷ 40 × 8.
 * 주 15시간 미만은 주휴수당이 발생하지 않으므로 0 이다(근로기준법 제55조·제18조③).
 */
export function defaultPaidHolidayHours(weekHours: number): number {
  if (weekHours < 15) return 0;
  return Math.min(weekHours / 40, 1) * dayHours;
}
