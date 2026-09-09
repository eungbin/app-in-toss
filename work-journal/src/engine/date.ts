/**
 * 날짜 헬퍼 — 전부 "YYYY-MM-DD" 문자열과 UTC 산술만 쓴다.
 * 로컬 타임존으로 Date 를 만들면 자정 근처에서 하루가 밀린다.
 */

const DAY_MS = 86_400_000;

export function toUtc(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  return Date.UTC(y, m - 1, d);
}

export function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return toIso(toUtc(iso) + n * DAY_MS);
}

export function diffDays(fromIso: string, toIso_: string): number {
  return Math.round((toUtc(toIso_) - toUtc(fromIso)) / DAY_MS);
}

/** 0 = 일요일 … 6 = 토요일 */
export function dayOfWeek(iso: string): number {
  return new Date(toUtc(iso)).getUTCDay();
}

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function dowLabel(iso: string): string {
  return DOW_KO[dayOfWeek(iso)] as string;
}

/** 그 날짜가 속한 주(월~일)의 월요일 */
export function weekStart(iso: string): string {
  const dow = dayOfWeek(iso);
  // 일요일(0)은 그 주의 마지막 날이므로 6일 전이 월요일이다
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(iso, -back);
}

/** 그 주의 일요일 */
export function weekEnd(weekStartIso: string): string {
  return addDays(weekStartIso, 6);
}

/** "YYYY-MM" */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthOf(monthKeyStr: string): { year: number; month: number } {
  return { year: Number(monthKeyStr.slice(0, 4)), month: Number(monthKeyStr.slice(5, 7)) };
}

/** "YYYY-MM" 에 n 개월을 더한다 */
export function addMonths(monthKeyStr: string, n: number): string {
  const { year, month } = monthOf(monthKeyStr);
  const total = year * 12 + (month - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function daysInMonth(monthKeyStr: string): number {
  const { year, month } = monthOf(monthKeyStr);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 그 달 1일의 요일 (0 = 일) */
export function firstDayOfWeek(monthKeyStr: string): number {
  return dayOfWeek(`${monthKeyStr}-01`);
}

/** 분 → "HH:MM" (24시간 넘는 값은 다음 날로 접는다) */
export function hhmm(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * 분 → "n시간 m분". 시간이 딱 맞으면 "n시간", 1시간 미만이면 "n분".
 * 0 은 "0분" 이 아니라 **"0시간"** 이다 — 빈 상태의 "0분 · 0일" 이 어색하다.
 */
export function hourText(minutes: number): string {
  if (minutes === 0) return '0시간';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}
