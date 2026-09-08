/** T7·T8 — docs/FUNCTIONAL_SPEC.md §5 */
import { describe, expect, it } from 'vitest';
import { checkGate, dateKey, midnightAfter } from '../gate';
import { SAVE_FREE_PER_DAY } from '@/constants';

const NOW = new Date('2026-09-08T14:30:00');
const base = { gateOpenUntil: null, adsAvailable: true };

describe('T7 — 하루 3장 무료', () => {
  it('0·1·2장은 허용', () => {
    for (const n of [0, 1, 2]) {
      expect(checkGate({ ...base, savedToday: n }, NOW)).toBe('allow');
    }
  });

  it('3장째에 상한에 닿는다', () => {
    expect(SAVE_FREE_PER_DAY).toBe(3);
    expect(checkGate({ ...base, savedToday: 3 }, NOW)).toBe('gate');
    expect(checkGate({ ...base, savedToday: 10 }, NOW)).toBe('gate');
  });

  it('보상을 받으면 자정까지 열린다', () => {
    const until = midnightAfter(NOW);
    expect(checkGate({ savedToday: 99, gateOpenUntil: until, adsAvailable: true }, NOW)).toBe('allow');
  });

  it('자정을 넘기면 다시 막힌다', () => {
    const until = midnightAfter(NOW);
    const tomorrow = new Date('2026-09-09T00:00:01');
    expect(checkGate({ savedToday: 99, gateOpenUntil: until, adsAvailable: true }, tomorrow)).toBe('gate');
  });
});

describe('T8 — 광고를 붙일 수 없으면 열어 둔다', () => {
  it('광고 미지원이면 몇 장을 저장했든 허용', () => {
    expect(checkGate({ savedToday: 999, gateOpenUntil: null, adsAvailable: false }, NOW)).toBe('allow');
  });
});

describe('midnightAfter', () => {
  it('다음 날 00:00 이다', () => {
    const d = new Date(midnightAfter(NOW));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8); // 9월
    expect(d.getDate()).toBe(9);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('자정 직전에도 다음 날을 가리킨다', () => {
    const late = new Date('2026-09-08T23:59:59');
    expect(new Date(midnightAfter(late)).getDate()).toBe(9);
  });

  it('월말을 넘긴다', () => {
    const eom = new Date('2026-09-30T20:00:00');
    const d = new Date(midnightAfter(eom));
    expect(d.getMonth()).toBe(9); // 10월
    expect(d.getDate()).toBe(1);
  });
});

describe('dateKey', () => {
  it('로컬 날짜를 YYYY-MM-DD 로', () => {
    expect(dateKey(NOW)).toBe('2026-09-08');
    expect(dateKey(new Date('2026-01-05T09:00:00'))).toBe('2026-01-05');
  });
});
