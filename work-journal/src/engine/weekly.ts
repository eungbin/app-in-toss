/**
 * 주휴수당 (CE-3) — docs/FUNCTIONAL_SPEC.md §3-4
 *
 * 근로기준법 제55조 제1항은 1주에 평균 1회 이상의 유급휴일을 정하고, 시행령 제30조 제1항은
 * 그것을 "1주 동안의 소정근로일을 개근한 자" 에게 주라고 한다. 제18조 제3항은 1주 소정근로
 * 15시간 미만이면 제55조를 적용하지 않는다.
 *
 * 소정근로시간은 원칙상 계약상 시간이지만 이 앱은 근로계약 일정을 입력받지 않는다(구판도 그랬다).
 * 그래서 **기록된 주의 실근로시간**으로 15시간을 판정하고, 기록된 날은 출근한 날로 본다.
 * 화면에 그 기준을 그대로 적어 사용자가 차이를 알 수 있게 한다.
 *
 * 주휴일은 5인 미만 사업장에도 적용된다(시행령 별표 1의 제4장에 제55조 제1항이 있다).
 */
import type { LegalFile, WeeklyHoliday, WorkRecord, Workplace } from '@/types';
import { LEGAL } from '@/data';
import { splitShift } from './shift';
import { addDays, dayOfWeek, monthKey, weekEnd } from './date';

/**
 * 한 주·한 근무지의 주휴수당.
 * @param records 그 근무지의 기록 전부(주 밖은 걸러 낸다)
 * @param today   "YYYY-MM-DD". 그 주 일요일이 오늘 이전이면 확정된다
 */
export function weeklyHoliday(
  records: WorkRecord[],
  wp: Pick<Workplace, 'id' | 'hourlyWage' | 'weeklyHolidayAuto'>,
  weekStartIso: string,
  today: string,
  legal: LegalFile = LEGAL,
): WeeklyHoliday {
  const end = weekEnd(weekStartIso);
  let workMin = 0;
  for (const r of records) {
    if (r.workplaceId !== wp.id) continue;
    if (r.date < weekStartIso || r.date > end) continue;
    workMin += splitShift(r, legal).work;
  }

  const eligible = wp.weeklyHolidayAuto && workMin >= legal.weeklyHoliday.minHours * 60;
  // 주휴시간 = 1주 소정근로시간 ÷ 40시간 × 8시간, 8시간 상한
  const raw = Math.floor((workMin * legal.weeklyHoliday.capMinutes) / legal.weeklyHoliday.stdWeekMinutes);
  const holidayMin = Math.min(legal.weeklyHoliday.capMinutes, raw);
  const pay = eligible ? Math.floor((holidayMin * Math.max(0, Math.floor(wp.hourlyWage))) / 60) : 0;

  return {
    weekStart: weekStartIso,
    workplaceId: wp.id,
    workMin,
    eligible,
    holidayMin,
    pay,
    settled: end < today,
  };
}

/**
 * 그 달에 귀속되는 주의 월요일 목록.
 * **월 귀속은 그 주 일요일이 속한 달로 정한다** — 주가 달을 걸쳐도 주휴수당이 두 달에 나뉘지 않는다.
 */
export function weeksOfMonth(monthKeyStr: string): string[] {
  const out: string[] = [];
  const first = `${monthKeyStr}-01`;
  const dow = dayOfWeek(first);
  const firstSunday = dow === 0 ? first : addDays(first, 7 - dow);

  let sunday = firstSunday;
  while (monthKey(sunday) === monthKeyStr) {
    out.push(addDays(sunday, -6));
    sunday = addDays(sunday, 7);
  }
  return out;
}
