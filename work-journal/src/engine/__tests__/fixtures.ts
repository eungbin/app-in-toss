/** 테스트 픽스처 — 골든 케이스의 근거는 docs/FACT_CHECK.md */
import type { Workplace, WorkRecord } from '@/types';

/** 2026년 최저임금 */
export const WAGE = 10_320;

export function makeWorkplace(over: Partial<Workplace> = {}): Workplace {
  return {
    id: 'w1',
    name: '카페 오후',
    hourlyWage: WAGE,
    fivePlus: true,
    payday: 10,
    incomeType: 'employee',
    weeklyHolidayAuto: true,
    dependents: 1,
    children: 0,
    nonTaxableMonthly: 0,
    taxRatio: 1,
    insurance: { nps: true, nhis: true, ei: true },
    reportedMonthly: 0,
    color: 'blue',
    createdAt: '2026-09-01',
    ...over,
  };
}

/** 시각은 자정 기준 분. h(9) = 540 */
export const h = (hour: number, min = 0): number => hour * 60 + min;

export function makeRecord(over: Partial<WorkRecord> = {}): WorkRecord {
  return {
    id: 'r1',
    workplaceId: 'w1',
    date: '2026-09-09',
    start: h(9),
    end: h(18),
    breakMin: 60,
    extraPay: 0,
    holiday: false,
    memo: '',
    ...over,
  };
}
