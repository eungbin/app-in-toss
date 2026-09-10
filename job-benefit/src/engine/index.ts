/** 엔진 진입점 — 순수 함수만. docs/FUNCTIONAL_SPEC.md §3 */
import type { Breakdown, Input } from '../types';
import { insuredBand, periodDays, tenureDays } from './period';
import { defaultPaidHolidayHours, stdDayHours } from './std-hours';
import { averageDaily, baseDaily, benefitDaily, minBaseDaily, minWageOf } from './wage';
import { benefitDays } from './days';
import { eligibility } from './eligibility';

export * from './period';
export * from './std-hours';
export * from './wage';
export * from './days';
export * from './early';
export * from './curve';
export * from './eligibility';
export { defaultPaidHolidayHours };

export function calculate(input: Input, today: string): Breakdown {
  const days = periodDays(input.quitDate);
  const tenure = tenureDays(input.hiredDate, input.quitDate);
  const band = insuredBand(input.hiredDate, input.quitDate);
  const treatedAs50plus = input.ageAtQuit >= 50 || input.disabled;

  const average = averageDaily(input.wageTotal3m, days);
  const hours = stdDayHours(input.stdHours);
  const minBase = minBaseDaily(hours, minWageOf(Number(input.quitDate.slice(0, 4))));
  const base = baseDaily(average, minBase, input.ordinaryDaily);
  const daily = benefitDaily(base.baseDaily, minBase, base.applied);
  const payDays = benefitDays(treatedAs50plus, band);
  const { verdict, reasons } = eligibility(input, tenure, today);

  return {
    verdict,
    reasons,
    insuredBand: band,
    insuredDaysEstimated: tenure,
    treatedAs50plus,
    periodDays: days,
    averageDaily: average,
    stdDayHours: hours,
    minBaseDaily: minBase,
    baseDaily: base.baseDaily,
    applied: daily.applied,
    benefitDaily: daily.benefitDaily,
    benefitDays: payDays,
    total: daily.benefitDaily * payDays,
  };
}
