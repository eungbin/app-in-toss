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
 * 평균임금 산정 기간의 일수 — 이직일 직전 3개월(이직일은 제외).
 * 경계의 정확한 정의는 미확정이다(docs/FUNCTIONAL_SPEC.md O-2).
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

/** 별표 1 의 피보험기간 5구간. 달력 기준으로 만 n년을 채웠는지로 가른다 */
export function insuredBand(hiredDate: string, quitDate: string): InsuredBand {
  const reached = (years: number): boolean => parse(quitDate) >= parse(addMonths(hiredDate, years * 12));
  if (reached(10)) return 'gte10';
  if (reached(5)) return 'y5to10';
  if (reached(3)) return 'y3to5';
  if (reached(1)) return 'y1to3';
  return 'lt1';
}
