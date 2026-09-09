import { describe, expect, it } from 'vitest';
import { weeklyHoliday, weeksOfMonth } from '../weekly';
import { WAGE, h, makeRecord, makeWorkplace } from './fixtures';
import type { WorkRecord } from '@/types';

const wp = makeWorkplace();
/** 2026-09-07(월)부터 n일치, 하루 minutes 분 근무 */
function week(days: number, minutes: number): WorkRecord[] {
  return Array.from({ length: days }, (_, i) =>
    makeRecord({
      id: `r${i}`,
      date: `2026-09-${String(7 + i).padStart(2, '0')}`,
      start: h(9),
      end: h(9) + minutes + 60,
      breakMin: 60,
    }),
  );
}

const wh = (recs: WorkRecord[], today = '2026-09-20') => weeklyHoliday(recs, wp, '2026-09-07', today);

describe('주휴수당 (CE-3)', () => {
  it('주 15시간 미만이면 지급 대상이 아니다 — 제18조 제3항', () => {
    // 14.5시간 = 870분
    const r = wh([...week(2, 300), ...week(1, 270).map((x) => ({ ...x, id: 'r9', date: '2026-09-09' }))]);
    expect(r.workMin).toBe(870);
    expect(r.eligible).toBe(false);
    expect(r.pay).toBe(0);
  });

  it('주 15시간이면 주휴 3시간 = 30,960원', () => {
    const r = wh(week(3, 300)); // 5시간 × 3 = 15시간
    expect(r.workMin).toBe(900);
    expect(r.eligible).toBe(true);
    expect(r.holidayMin).toBe(180); // 900 ÷ 2400 × 480
    expect(r.pay).toBe(3 * WAGE);
  });

  it('주 16시간이면 192분 = 33,024원 — 구판 화면의 "이번 주 주휴 예정"', () => {
    const r = wh(week(2, 480));
    expect(r.workMin).toBe(960);
    expect(r.holidayMin).toBe(192);
    expect(r.pay).toBe(33_024);
  });

  it('주 40시간이면 8시간 = 82,560원', () => {
    const r = wh(week(5, 480));
    expect(r.workMin).toBe(2400);
    expect(r.holidayMin).toBe(480);
    expect(r.pay).toBe(82_560);
  });

  it('주 48시간이어도 8시간이 상한이다', () => {
    const r = wh(week(6, 480));
    expect(r.workMin).toBe(2880);
    expect(r.holidayMin).toBe(480);
    expect(r.pay).toBe(82_560);
  });

  it('자동 계산을 끄면 조건을 채워도 0이다', () => {
    const off = weeklyHoliday(week(5, 480), makeWorkplace({ weeklyHolidayAuto: false }), '2026-09-07', '2026-09-20');
    expect(off.eligible).toBe(false);
    expect(off.pay).toBe(0);
  });

  it('그 주 일요일이 지나야 확정된다', () => {
    // 2026-09-07(월) ~ 09-13(일)
    expect(wh(week(2, 480), '2026-09-09').settled).toBe(false);
    expect(wh(week(2, 480), '2026-09-13').settled).toBe(false);
    expect(wh(week(2, 480), '2026-09-14').settled).toBe(true);
  });

  it('주 밖의 기록과 다른 근무지 기록은 세지 않는다', () => {
    const outside = makeRecord({ id: 'x', date: '2026-09-15', start: h(9), end: h(18) });
    const other = makeRecord({ id: 'y', date: '2026-09-08', workplaceId: 'w2', start: h(9), end: h(18) });
    const r = wh([...week(2, 480), outside, other]);
    expect(r.workMin).toBe(960);
  });

  it('월 귀속은 그 주 일요일이 속한 달이다', () => {
    // 2026-09-01 은 화요일. 일요일은 6·13·20·27일 → 월요일 4개
    expect(weeksOfMonth('2026-09')).toEqual(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21']);
    // 09-28(월) ~ 10-04(일) 주는 10월에 귀속된다
    expect(weeksOfMonth('2026-10')[0]).toBe('2026-09-28');
  });
});
