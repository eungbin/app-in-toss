import { describe, expect, it } from 'vitest';
import { monthSummary } from '../month';
import { h, makeRecord, makeWorkplace } from './fixtures';

const TODAY = '2026-09-09';
const wp = makeWorkplace();

/** 구판 화면과 같은 상태: 9/8·9/9 각 09:00~18:00 휴게 60분 */
const twoDays = [
  makeRecord({ id: 'a', date: '2026-09-08' }),
  makeRecord({ id: 'b', date: '2026-09-09' }),
];

describe('월 집계 (CE-4)', () => {
  it('기록이 없으면 전부 0이다', () => {
    const s = monthSummary({ records: [], workplaces: [wp], month: '2026-09', today: TODAY });
    expect(s).toMatchObject({ workMin: 0, days: 0, gross: 0, deductions: 0, net: 0 });
  });

  it('구판 화면의 2건 — 16시간 · 2일 · 세전 165,120원', () => {
    const s = monthSummary({ records: twoDays, workplaces: [wp], month: '2026-09', today: TODAY });
    expect(s.workMin).toBe(960);
    expect(s.days).toBe(2);
    expect(s.workPay).toBe(165_120);
    expect(s.gross).toBe(165_120);
    // net-pay 엔진 값 (구판 화면의 27,650원이 아니다)
    expect(s.deductions).toBe(32_355);
    expect(s.net).toBe(132_765);
  });

  it('진행 중인 주의 주휴는 합계에 넣지 않고 따로 낸다', () => {
    const s = monthSummary({ records: twoDays, workplaces: [wp], month: '2026-09', today: TODAY });
    // 2026-09-07 주에 960분(16시간) → 조건 충족. 일요일 09-13 이 아직 지나지 않았다
    expect(s.weeklyHolidayCount).toBe(0);
    expect(s.weeklyHolidayPay).toBe(0);
    expect(s.pendingWeeklyHolidayPay).toBe(33_024);
  });

  it('일요일이 지나면 주휴가 확정되어 세전에 들어간다', () => {
    const s = monthSummary({ records: twoDays, workplaces: [wp], month: '2026-09', today: '2026-09-20' });
    expect(s.weeklyHolidayCount).toBe(1);
    expect(s.weeklyHolidayPay).toBe(33_024);
    expect(s.pendingWeeklyHolidayPay).toBe(0);
    expect(s.gross).toBe(165_120 + 33_024);
  });

  it('기록의 월 귀속은 출근 날짜다 — 자정을 넘겨도 그 달에 센다', () => {
    const overnight = makeRecord({ id: 'z', date: '2026-08-31', start: h(22), end: h(6), breakMin: 0 });
    const sep = monthSummary({ records: [overnight], workplaces: [wp], month: '2026-09', today: '2026-09-20' });
    const aug = monthSummary({ records: [overnight], workplaces: [wp], month: '2026-08', today: '2026-09-20' });
    expect(sep.workMin).toBe(0);
    expect(aug.workMin).toBe(480);
  });

  it('잠긴 근무지는 합계에서 빠지고 목록에만 남는다', () => {
    const wp2 = makeWorkplace({ id: 'w2', name: '편의점 야간' });
    const recs = [...twoDays, makeRecord({ id: 'c', workplaceId: 'w2', date: '2026-09-09' })];
    const s = monthSummary({
      records: recs,
      workplaces: [wp, wp2],
      month: '2026-09',
      today: TODAY,
      activeWorkplaceIds: ['w1'],
    });
    expect(s.lockedWorkplaceIds).toEqual(['w2']);
    expect(s.workMin).toBe(960);
    expect(s.byWorkplace).toHaveLength(1);
  });

  it('근무지가 둘이면 공제를 근무지별로 계산해 합한다', () => {
    const wp2 = makeWorkplace({ id: 'w2', incomeType: 'business' });
    const recs = [...twoDays, makeRecord({ id: 'c', workplaceId: 'w2', date: '2026-09-09' })];
    const s = monthSummary({ records: recs, workplaces: [wp, wp2], month: '2026-09', today: TODAY });
    const [a, b] = s.byWorkplace;
    expect(a?.deductions.total).toBe(32_355);
    // 82,560 × 3% = 2,470원(10원 절사) + 지방소득세 240원
    expect(b?.deductions.incomeTax).toBe(2_470);
    expect(s.deductions).toBe((a?.deductions.total ?? 0) + (b?.deductions.total ?? 0));
  });

  it('가산은 별도 행으로 집계한다', () => {
    const night = makeRecord({ id: 'n', date: '2026-09-10', start: h(18), end: h(2) });
    const s = monthSummary({ records: [night], workplaces: [wp], month: '2026-09', today: '2026-09-20' });
    expect(s.workPay).toBe(72_240);
    expect(s.addedPay).toBe(15_480);
    expect(s.gross).toBe(87_720);
  });
});
