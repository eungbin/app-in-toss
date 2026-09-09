/**
 * 월 집계 (CE-4, CE-6) — docs/FUNCTIONAL_SPEC.md §3-5
 *
 * 기록의 월 귀속은 **출근 날짜**다(자정을 넘겨 퇴근해도 출근한 달로 센다).
 * 주휴수당의 월 귀속은 그 주 일요일이 속한 달이다 — weekly.weeksOfMonth.
 * 공제는 근무지별로 계산한 뒤 합한다. 사업장별 원천징수와 같은 모양이다.
 */
import type {
  LegalFile,
  MonthSummary,
  RatesFile,
  TaxTableFile,
  WeeklyHoliday,
  WorkRecord,
  Workplace,
  WorkplaceMonth,
} from '@/types';
import { LEGAL, RATES, TAX_TABLES } from '@/data';
import { splitShift } from './shift';
import { dayPay } from './pay';
import { weeklyHoliday, weeksOfMonth } from './weekly';
import { monthDeductions } from './deductions';

export interface MonthInput {
  /** 그 달과 인접 달의 기록. 주 경계 때문에 앞뒤 달이 필요하다 */
  records: WorkRecord[];
  workplaces: Workplace[];
  /** "YYYY-MM" */
  month: string;
  /** "YYYY-MM-DD" */
  today: string;
  /** 합계에 넣을 근무지. 없으면 전부 */
  activeWorkplaceIds?: string[];
}

export interface MonthData {
  legal: LegalFile;
  rates: RatesFile;
  tables: TaxTableFile[];
}

const BUNDLED: MonthData = { legal: LEGAL, rates: RATES, tables: TAX_TABLES };

export function monthSummary(input: MonthInput, data: MonthData = BUNDLED): MonthSummary {
  const { records, workplaces, month, today } = input;
  const active = input.activeWorkplaceIds ?? workplaces.map((w) => w.id);
  const activeSet = new Set(active);
  const weeks = weeksOfMonth(month);

  const byWorkplace: WorkplaceMonth[] = [];
  const locked: string[] = [];

  for (const wp of workplaces) {
    if (!activeSet.has(wp.id)) {
      locked.push(wp.id);
      continue;
    }

    const mine = records.filter((r) => r.workplaceId === wp.id);
    const inMonth = mine.filter((r) => r.date.slice(0, 7) === month);

    let workMin = 0;
    let workPay = 0;
    let addedPay = 0;
    let extraPay = 0;
    const dates = new Set<string>();
    for (const r of inMonth) {
      const split = splitShift(r, data.legal);
      const pay = dayPay(split, r, wp, data.legal);
      workMin += split.work;
      workPay += pay.base;
      extraPay += pay.extra;
      addedPay += pay.overtimePay + pay.nightPay + pay.holidayPay;
      dates.add(r.date);
    }

    let weeklyHolidayCount = 0;
    let weeklyHolidayPay = 0;
    let pending: WeeklyHoliday | null = null;
    for (const ws of weeks) {
      const wh = weeklyHoliday(mine, wp, ws, today, data.legal);
      if (!wh.eligible) continue;
      if (wh.settled) {
        weeklyHolidayCount += 1;
        weeklyHolidayPay += wh.pay;
      } else if (pending === null || wh.weekStart > pending.weekStart) {
        pending = wh;
      }
    }

    const gross = workPay + extraPay + addedPay + weeklyHolidayPay;
    const deductions = monthDeductions(wp, gross, inMonth, today, data);

    byWorkplace.push({
      workplaceId: wp.id,
      workMin,
      days: dates.size,
      workPay: workPay + extraPay,
      addedPay,
      extraPay,
      weeklyHolidayCount,
      weeklyHolidayPay,
      pendingWeeklyHoliday: pending,
      gross,
      deductions,
      net: gross - deductions.total,
    });
  }

  const sum = (pick: (w: WorkplaceMonth) => number): number => byWorkplace.reduce((a, w) => a + pick(w), 0);

  return {
    month,
    workMin: sum((w) => w.workMin),
    days: new Set(
      records.filter((r) => r.date.slice(0, 7) === month && activeSet.has(r.workplaceId)).map((r) => r.date),
    ).size,
    workPay: sum((w) => w.workPay),
    addedPay: sum((w) => w.addedPay),
    weeklyHolidayCount: sum((w) => w.weeklyHolidayCount),
    weeklyHolidayPay: sum((w) => w.weeklyHolidayPay),
    pendingWeeklyHolidayPay: sum((w) => w.pendingWeeklyHoliday?.pay ?? 0),
    gross: sum((w) => w.gross),
    deductions: sum((w) => w.deductions.total),
    net: sum((w) => w.net),
    byWorkplace,
    lockedWorkplaceIds: locked,
  };
}
