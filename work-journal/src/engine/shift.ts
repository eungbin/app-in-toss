/**
 * 시간 분해 (CE-1) — docs/FUNCTIONAL_SPEC.md §3-2
 *
 * 야간은 근로기준법 제56조 제3항의 "오후 10시부터 다음 날 오전 6시 사이의 근로"다.
 * **휴게시간은 야간 구간에서 먼저 차감한다.** 사용자에게 유리하지 않은 쪽으로 계산하는 것이
 * "예상액" 앱의 안전한 기본값이고, 구판도 화면에 그렇게 적어 두었다.
 */
import type { LegalFile, ShiftSplit, WorkRecord } from '@/types';
import { LEGAL } from '@/data';

const DAY_MIN = 1440;

/** [aStart, aEnd) 와 [bStart, bEnd) 가 겹치는 분 */
function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/**
 * 기록의 근무 구간 [start, end). 퇴근이 출근보다 **작으면** 다음 날로 넘긴다.
 * 같은 시각은 24시간 근무가 아니라 입력 실수로 본다 — validateRecord 가 막는다.
 */
export function spanOf(rec: Pick<WorkRecord, 'start' | 'end'>): { start: number; end: number } {
  const start = rec.start;
  const end = rec.end < rec.start ? rec.end + DAY_MIN : rec.end;
  return { start, end };
}

/** 근무 구간과 야간 구간(22:00~06:00)이 겹치는 분 */
export function nightMinutes(start: number, end: number, legal: LegalFile = LEGAL): number {
  let sum = 0;
  // 기록은 최대 24시간이라 앞뒤 이틀치 야간 구간만 보면 된다
  for (let k = -1; k <= 2; k += 1) {
    const base = k * DAY_MIN;
    // 자정 ~ 06:00
    sum += overlap(start, end, base, base + legal.night.endMin);
    // 22:00 ~ 자정
    sum += overlap(start, end, base + legal.night.startMin, base + DAY_MIN);
  }
  return sum;
}

/**
 * 기록 한 건을 실근무·야간·연장·휴일로 나눈다. 모두 분 단위 정수.
 * 휴일 근무이면 연장 가산을 따로 붙이지 않는다 — 휴일 8시간 초과분의 100분의 100이 그 몫이다.
 */
export function splitShift(rec: WorkRecord, legal: LegalFile = LEGAL): ShiftSplit {
  const { start, end } = spanOf(rec);
  const span = end - start;
  const breakMin = Math.max(0, Math.min(rec.breakMin, span));
  const work = span - breakMin;

  const rawNight = nightMinutes(start, end, legal);
  const night = Math.max(0, rawNight - breakMin);

  const std = legal.dailyStdMinutes;
  if (rec.holiday) {
    const holidayIn8 = Math.min(work, std);
    return { span, work, night, overtime: 0, holidayIn8, holidayOver8: work - holidayIn8 };
  }
  return { span, work, night, overtime: Math.max(0, work - std), holidayIn8: 0, holidayOver8: 0 };
}

/** 저장 전에 막아야 하는 입력. null 이면 통과 */
export function validateRecord(rec: Pick<WorkRecord, 'start' | 'end' | 'breakMin'>): 'sameTime' | 'breakTooLong' | null {
  const { start, end } = spanOf(rec);
  const span = end - start;
  if (span === 0) return 'sameTime';
  if (rec.breakMin >= span) return 'breakTooLong';
  return null;
}
