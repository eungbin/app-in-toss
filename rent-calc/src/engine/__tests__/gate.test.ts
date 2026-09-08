/** 게이트 — FUNCTIONAL_SPEC 3-8 AC */
import { describe, expect, it } from 'vitest';
import { emptyUnlock, isUnlocked, nextMidnight, unlockUntilMidnight } from '../gate';

describe('nextMidnight', () => {
  it('같은 날 23:59 → 다음 날 00:00 (기기 로컬 시간)', () => {
    const now = new Date('2026-09-08T23:59:00').getTime();
    const d = new Date(nextMidnight(now));
    // toISOString 은 UTC로 바꿔 버린다. 자정 판정은 기기 로컬 기준이므로 로컬 값을 본다
    expect(d.getDate()).toBe(9);
    expect(d.getMonth()).toBe(8);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe('isUnlocked', () => {
  it('처음에는 잠겨 있다', () => {
    expect(isUnlocked(emptyUnlock, Date.now())).toBe(false);
  });

  it('23:59에 해제하면 그 시각은 열려 있고 00:00에는 잠긴다', () => {
    const at2359 = new Date('2026-09-08T23:59:00').getTime();
    const unlock = unlockUntilMidnight(at2359);
    expect(isUnlocked(unlock, at2359)).toBe(true);
    expect(isUnlocked(unlock, new Date('2026-09-09T00:00:00').getTime())).toBe(false);
  });

  it('해제 직후는 열려 있다', () => {
    const now = new Date('2026-09-08T10:00:00').getTime();
    expect(isUnlocked(unlockUntilMidnight(now), now + 1000)).toBe(true);
  });
});
