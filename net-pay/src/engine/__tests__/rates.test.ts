import { describe, expect, it } from 'vitest';
import { RATES as BUNDLED_RATES } from '@/data';
import { isSortedByFrom, rateFor, rateForYear } from '../rates';
import { RATES } from './fixtures';

describe('요율 조회', () => {
  it('시행일 이하의 마지막 행을 고른다', () => {
    expect(rateFor(RATES, '2025-06-30').from).toBe('2025-01-01');
    expect(rateFor(RATES, '2026-01-01').from).toBe('2026-01-01');
    expect(rateFor(RATES, '2030-12-31').from).toBe('2026-01-01');
  });

  it('데이터보다 앞선 날짜는 첫 행으로 대체한다', () => {
    expect(rateFor(RATES, '2000-01-01').from).toBe('2025-01-01');
  });

  it('연도 조회는 그 해 하반기(12-31) 시행값을 쓴다', () => {
    // 번들 데이터에서 2026년은 7월 개정분(상한 659만)이 적용돼야 한다
    expect(rateForYear(BUNDLED_RATES, 2026).nps.baseMax).toBe(6_590_000);
    expect(rateForYear(BUNDLED_RATES, 2025).nps.baseMax).toBe(6_370_000);
  });

  it('번들 요율은 from 오름차순이다', () => {
    expect(isSortedByFrom(BUNDLED_RATES)).toBe(true);
  });
});
