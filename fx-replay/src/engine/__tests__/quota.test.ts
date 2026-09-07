import { describe, expect, it } from 'vitest';
import { available, consume, emptyQuota, grantBonus, localDate, rollover } from '../quota';

describe('quota', () => {
  it('하루 3판', () => {
    let q = emptyQuota('2026-09-07');
    expect(available(q, false)).toBe(3);
    for (let i = 0; i < 3; i++) q = consume(q, false)!;
    expect(available(q, false)).toBe(0);
    expect(consume(q, false)).toBeNull();
  });

  it('날짜가 바뀌면 used만 초기화, bonus는 유지', () => {
    const q = { date: '2026-09-06', used: 3, bonus: 2 };
    const next = rollover(q, '2026-09-07');
    expect(next).toEqual({ date: '2026-09-07', used: 0, bonus: 2 });
    expect(available(next, false)).toBe(5);
  });

  it('같은 날이면 그대로', () => {
    const q = { date: '2026-09-07', used: 2, bonus: 1 };
    expect(rollover(q, '2026-09-07')).toBe(q);
  });

  it('무료분을 먼저 쓰고 그다음 bonus를 쓴다', () => {
    let q = { date: 'd', used: 2, bonus: 1 };
    q = consume(q, false)!;
    expect(q).toEqual({ date: 'd', used: 3, bonus: 1 });
    q = consume(q, false)!;
    expect(q).toEqual({ date: 'd', used: 3, bonus: 0 });
    expect(consume(q, false)).toBeNull();
  });

  it('광고 보상은 5개까지 누적', () => {
    let q = emptyQuota('d');
    for (let i = 0; i < 7; i++) q = grantBonus(q);
    expect(q.bonus).toBe(5);
  });

  it('프리미엄은 무제한이고 차감되지 않는다', () => {
    const q = { date: 'd', used: 3, bonus: 0 };
    expect(available(q, true)).toBe(Number.POSITIVE_INFINITY);
    expect(consume(q, true)).toBe(q);
  });

  it('localDate는 로컬 기준 YYYY-MM-DD', () => {
    expect(localDate(new Date(2026, 8, 7, 23, 30))).toBe('2026-09-07');
    expect(localDate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});
