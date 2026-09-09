import { describe, expect, it } from 'vitest';
import { dayPay } from '../pay';
import { splitShift } from '../shift';
import { WAGE, h, makeRecord, makeWorkplace } from './fixtures';

const pay = (rec = makeRecord(), fivePlus = true) => {
  const wp = makeWorkplace({ fivePlus });
  return dayPay(splitShift(rec), rec, wp);
};

describe('일급 (CE-2)', () => {
  it('평일 8시간 = 82,560원 — 구판 화면과 같다', () => {
    // 8시간 × 10,320원 = 82,560원
    expect(pay().total).toBe(8 * WAGE);
    expect(pay().base).toBe(82_560);
  });

  it('야간 180분에 50% 가산이 붙는다 (5인 이상)', () => {
    const rec = makeRecord({ start: h(18), end: h(2) });
    const p = pay(rec);
    expect(p.base).toBe(72_240); // 7시간 × 10,320
    expect(p.nightPay).toBe(15_480); // 180분 × 10,320 × 0.5 ÷ 60
    expect(p.total).toBe(87_720);
  });

  it('5인 미만이면 가산이 0이다 — 근로기준법 시행령 별표 1', () => {
    const rec = makeRecord({ start: h(18), end: h(2) });
    const p = pay(rec, false);
    expect(p.nightPay).toBe(0);
    expect(p.overtimePay).toBe(0);
    expect(p.holidayPay).toBe(0);
    expect(p.total).toBe(72_240);
  });

  it('야간과 연장이 겹치면 둘 다 가산한다 — 제56조 제1항·제3항', () => {
    const rec = makeRecord({ start: h(20), end: h(6) });
    const p = pay(rec);
    expect(p.base).toBe(92_880); // 9시간
    expect(p.nightPay).toBe(36_120); // 420분
    expect(p.overtimePay).toBe(5_160); // 60분
    expect(p.total).toBe(134_160);
  });

  it('휴일 10시간 — 8시간 이내 50%, 초과 100%', () => {
    const rec = makeRecord({ end: h(19), breakMin: 0, holiday: true });
    const p = pay(rec);
    expect(p.base).toBe(103_200); // 10시간
    expect(p.holidayPay).toBe(41_280 + 20_640); // 480분 × 0.5 + 120분 × 1.0
    expect(p.overtimePay).toBe(0);
    expect(p.total).toBe(165_120);
  });

  it('추가수당은 그대로 더한다', () => {
    const rec = makeRecord({ extraPay: 5_000 });
    expect(pay(rec).total).toBe(82_560 + 5_000);
  });
});
