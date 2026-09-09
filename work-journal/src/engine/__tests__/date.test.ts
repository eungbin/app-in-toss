import { describe, expect, it } from 'vitest';
import { addDays, addMonths, daysInMonth, dowLabel, hhmm, hourText, monthKey, weekEnd, weekStart } from '../date';

describe('날짜 헬퍼', () => {
  it('2026-09-09 는 수요일이다 (구판 화면과 같다)', () => {
    expect(dowLabel('2026-09-09')).toBe('수');
    expect(dowLabel('2026-09-08')).toBe('화');
  });

  it('주는 월요일에 시작하고 일요일에 끝난다', () => {
    expect(weekStart('2026-09-09')).toBe('2026-09-07');
    expect(weekEnd('2026-09-07')).toBe('2026-09-13');
    // 일요일은 그 주의 마지막 날이다 — 다음 주로 넘기지 않는다
    expect(weekStart('2026-09-13')).toBe('2026-09-07');
    expect(weekStart('2026-09-14')).toBe('2026-09-14');
  });

  it('월 경계를 넘는다', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthKey('2026-09-09')).toBe('2026-09');
  });

  it('윤년을 센다', () => {
    expect(daysInMonth('2024-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2026-09')).toBe(30);
  });

  it('분을 시각·시간 문구로 바꾼다', () => {
    expect(hhmm(540)).toBe('09:00');
    expect(hhmm(1560)).toBe('02:00');
    expect(hourText(480)).toBe('8시간');
    expect(hourText(420)).toBe('7시간');
    expect(hourText(450)).toBe('7시간 30분');
    expect(hourText(45)).toBe('45분');
    // 빈 상태의 "0분 · 0일" 이 어색해서 0 만 시간으로 적는다
    expect(hourText(0)).toBe('0시간');
  });
});
