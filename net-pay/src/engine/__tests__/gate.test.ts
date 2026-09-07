import { describe, expect, it } from 'vitest';
import { emptyUnlock, isUnlocked, nextMidnight, unlockUntilMidnight } from '../gate';

describe('게이트 해제', () => {
  it('처음에는 잠겨 있다', () => {
    expect(isUnlocked(emptyUnlock, Date.now())).toBe(false);
  });

  it('다음 자정은 오늘보다 뒤이고 자정 정각이다', () => {
    const now = new Date(2026, 8, 7, 23, 59, 30).getTime();
    const m = nextMidnight(now);
    expect(m).toBeGreaterThan(now);
    const d = new Date(m);
    expect([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0, 0]);
    expect(d.getDate()).toBe(8);
  });

  it('해제하면 자정 직전까지 열려 있고 자정에 닫힌다', () => {
    const now = new Date(2026, 8, 7, 23, 59, 0).getTime();
    const u = unlockUntilMidnight(now);
    expect(isUnlocked(u, now)).toBe(true);
    expect(isUnlocked(u, now + 59 * 1000)).toBe(true);
    expect(isUnlocked(u, nextMidnight(now))).toBe(false);
    expect(isUnlocked(u, nextMidnight(now) + 1)).toBe(false);
  });

  it('월말·연말을 넘어가도 다음 날 자정을 가리킨다', () => {
    const eve = new Date(2026, 11, 31, 20, 0, 0).getTime();
    expect(new Date(nextMidnight(eve)).getFullYear()).toBe(2027);
  });
});
