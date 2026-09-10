/** 기간 계산 — docs/FUNCTIONAL_SPEC.md §3-2, §3-6 */
import type { InsuredBand } from '../types';

const DAY = 86_400_000;
const parse = (iso: string): number => {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) throw new Error(`날짜 형식이 잘못됐습니다: ${iso}`);
  return t;
};

/** 달 단위 이동. 말일 보정(1/31 - 1개월 = 12/31) */
function addMonths(iso: string, months: number): string {
  const d = new Date(parse(iso));
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

/**
 * 평균임금 산정 기간의 일수.
 *
 * 고용보험 모의계산은 **이직일을 포함해** 역산한다 — 이직일 2026-09-15 는
 * 2026-06-16 ~ 2026-09-15 (92일), 2026-09-30 은 2026-07-01 ~ 2026-09-30 (92일).
 * 구간의 시작·끝은 하루 밀리지만 **일수는 `이직일 − (이직일 − 3개월)` 로 같다.**
 * 그래서 아래 계산으로 관공서와 일수가 일치한다 (2026-09-11 대조, docs/FACT_CHECK.md 3장).
 */
export function periodDays(quitDate: string): number {
  const start = addMonths(quitDate, -3);
  const end = parse(quitDate) - DAY;
  const n = Math.round((end - parse(start)) / DAY) + 1;
  if (n < 80 || n > 95) throw new Error(`3개월 총일수가 이상합니다: ${n}일`);
  return n;
}

/** 재직 일수 — 입사일과 이직일을 모두 세지 않고 재직한 날의 수로 본다(이직일 제외) */
export function tenureDays(hiredDate: string, quitDate: string): number {
  const n = Math.round((parse(quitDate) - parse(hiredDate)) / DAY);
  if (n < 0) throw new Error('이직일이 입사일보다 앞섭니다');
  return n;
}

/** 재직 기간을 "n년 m개월" 로. 30일 나눗셈으로 근사하면 달력과 어긋난다 */
export function tenureYearsMonths(hiredDate: string, quitDate: string): { years: number; months: number } {
  const a = new Date(parse(hiredDate));
  const b = new Date(parse(quitDate));
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  if (months < 0) months = 0;
  return { years: Math.floor(months / 12), months: months % 12 };
}

/** 별표 1 의 피보험기간 5구간. 달력 기준으로 만 n년을 채웠는지로 가른다 */
export function insuredBand(hiredDate: string, quitDate: string): InsuredBand {
  const reached = (years: number): boolean => parse(quitDate) >= parse(addMonths(hiredDate, years * 12));
  if (reached(10)) return 'gte10';
  if (reached(5)) return 'y5to10';
  if (reached(3)) return 'y3to5';
  if (reached(1)) return 'y1to3';
  return 'lt1';
}
