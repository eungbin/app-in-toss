import { describe, expect, it } from 'vitest';
import { absSpan, findOverlap, nightMinutes, spanOf, splitShift, validateRecord } from '../shift';
import { h, makeRecord } from './fixtures';

describe('시간 분해 (CE-1)', () => {
  it('평일 09:00~18:00 휴게 60분 — 구판 화면의 기본 케이스', () => {
    const s = splitShift(makeRecord());
    expect(s).toMatchObject({ span: 540, work: 480, night: 0, overtime: 0, holidayIn8: 0, holidayOver8: 0 });
  });

  it('09:00~19:00 휴게 60분이면 8시간을 넘어 연장이 생긴다', () => {
    const s = splitShift(makeRecord({ end: h(19) }));
    expect(s.work).toBe(540);
    expect(s.overtime).toBe(60);
  });

  it('18:00~다음 날 02:00 — 자정을 넘기고 야간이 걸린다', () => {
    const rec = makeRecord({ start: h(18), end: h(2) });
    expect(spanOf(rec)).toEqual({ start: 1080, end: 1560 });
    // 야간 구간은 22:00~24:00(120분) + 24:00~02:00(120분) = 240분
    expect(nightMinutes(1080, 1560)).toBe(240);
    const s = splitShift(rec);
    // 휴게 60분은 야간에서 먼저 뺀다
    expect(s).toMatchObject({ span: 480, work: 420, night: 180, overtime: 0 });
  });

  it('20:00~다음 날 06:00 휴게 60분 — 야간 상한과 연장이 함께 걸린다', () => {
    const s = splitShift(makeRecord({ start: h(20), end: h(6) }));
    // 야간 구간 22:00~06:00 전부 = 480분, 휴게 60분 차감 → 420분
    expect(s).toMatchObject({ span: 600, work: 540, night: 420, overtime: 60 });
  });

  it('22:00~06:00 휴게 0분이면 전부 야간이다', () => {
    const s = splitShift(makeRecord({ start: h(22), end: h(6), breakMin: 0 }));
    expect(s).toMatchObject({ span: 480, work: 480, night: 480, overtime: 0 });
  });

  it('휴일 근무는 8시간까지와 초과분을 나누고 연장을 붙이지 않는다', () => {
    const s = splitShift(makeRecord({ end: h(19), breakMin: 0, holiday: true }));
    expect(s).toMatchObject({ work: 600, holidayIn8: 480, holidayOver8: 120, overtime: 0 });
  });

  it('휴게가 야간보다 길면 남는 만큼 주간에서 뺀다', () => {
    // 21:00~24:00 = 180분 중 야간은 22:00 이후 120분. 휴게 150분.
    const s = splitShift(makeRecord({ start: h(21), end: h(0), breakMin: 150 }));
    expect(s.span).toBe(180);
    expect(s.work).toBe(30);
    expect(s.night).toBe(0);
  });

  it('절대 구간은 자정을 넘어도 이어진다', () => {
    const a = absSpan({ date: '2026-09-09', start: h(18), end: h(2) });
    const b = absSpan({ date: '2026-09-10', start: h(1), end: h(9) });
    // 9/9 18:00~9/10 02:00 과 9/10 01:00~09:00 은 1시간 겹친다
    expect(a.to - a.from).toBe(480);
    expect(b.from).toBeLessThan(a.to);
  });

  it('입력 검증 — 출퇴근이 같거나 휴게가 근무보다 길면 막는다', () => {
    expect(validateRecord({ start: h(9), end: h(9), breakMin: 0 })).toBe('sameTime');
    expect(validateRecord({ start: h(9), end: h(18), breakMin: 540 })).toBe('breakTooLong');
    expect(validateRecord({ start: h(9), end: h(18), breakMin: 60 })).toBeNull();
  });
});

describe('시간 겹침 (CE-1a)', () => {
  const base = makeRecord({ id: 'a', date: '2026-09-09', start: h(9), end: h(18) });

  it('같은 날 겹치면 그 기록을 돌려준다', () => {
    const other = makeRecord({ id: 'b', date: '2026-09-09', start: h(14), end: h(20) });
    expect(findOverlap(base, [other])?.id).toBe('b');
  });

  it('맞닿은 구간은 겹친 것이 아니다', () => {
    const after = makeRecord({ id: 'b', date: '2026-09-09', start: h(18), end: h(22) });
    const before = makeRecord({ id: 'c', date: '2026-09-09', start: h(5), end: h(9) });
    expect(findOverlap(base, [after, before])).toBeNull();
  });

  it('근무지가 달라도 겹치면 막는다 — 한 사람이 두 곳에 동시에 있을 수 없다', () => {
    const other = makeRecord({ id: 'b', workplaceId: 'w2', date: '2026-09-09', start: h(10), end: h(12) });
    expect(findOverlap(base, [other])?.id).toBe('b');
  });

  it('자정을 넘는 기록과 다음 날 기록의 겹침을 잡는다', () => {
    const night = makeRecord({ id: 'n', date: '2026-09-09', start: h(18), end: h(2) });
    const nextMorning = makeRecord({ id: 'm', date: '2026-09-10', start: h(1), end: h(9) });
    expect(findOverlap(night, [nextMorning])?.id).toBe('m');
    expect(findOverlap(nextMorning, [night])?.id).toBe('n');
  });

  it('자정을 넘어도 다음 날 출근이 퇴근 뒤면 통과한다', () => {
    const night = makeRecord({ id: 'n', date: '2026-09-09', start: h(18), end: h(2) });
    const later = makeRecord({ id: 'm', date: '2026-09-10', start: h(9), end: h(18) });
    expect(findOverlap(night, [later])).toBeNull();
  });

  it('자기 자신은 겹침으로 세지 않는다 — 수정 저장이 막히면 안 된다', () => {
    expect(findOverlap(base, [base])).toBeNull();
  });

  it('다른 날 같은 시간은 겹치지 않는다', () => {
    const other = makeRecord({ id: 'b', date: '2026-09-10', start: h(9), end: h(18) });
    expect(findOverlap(base, [other])).toBeNull();
  });
});
