/** 임대차 신고 — FUNCTIONAL_SPEC 3-6 AC */
import { describe, expect, it } from 'vitest';
import { addDays, reportRequired } from '../report';

const now = new Date('2026-09-08T12:00:00');

describe('reportRequired — 금액 경계', () => {
  it('보증금 정확히 6천만 원은 대상이 아니다', () => {
    expect(reportRequired(60_000_000, 0, undefined, now).required).toBe(false);
  });

  it('보증금 6천만 원 + 1원은 대상', () => {
    const r = reportRequired(60_000_001, 0, undefined, now);
    expect(r.required).toBe(true);
    expect(r.reasons).toEqual(['deposit']);
  });

  it('월세 정확히 30만 원은 대상이 아니다', () => {
    expect(reportRequired(0, 300_000, undefined, now).required).toBe(false);
  });

  it('월세 30만 원 + 1원은 대상', () => {
    const r = reportRequired(0, 300_001, undefined, now);
    expect(r.reasons).toEqual(['rent']);
  });

  it('둘 다 넘으면 이유가 두 개', () => {
    expect(reportRequired(70_000_000, 350_000, undefined, now).reasons).toEqual([
      'deposit',
      'rent',
    ]);
  });

  it('생활법령정보 예시: 보증금 5천만 + 월세 35만 → 대상', () => {
    expect(reportRequired(50_000_000, 350_000, undefined, now).reasons).toEqual(['rent']);
  });

  it('생활법령정보 예시: 보증금 7천만 전세 → 대상', () => {
    expect(reportRequired(70_000_000, 0, undefined, now).reasons).toEqual(['deposit']);
  });
});

describe('reportRequired — 기한', () => {
  it('계약일 + 30일', () => {
    expect(reportRequired(70_000_000, 0, '2026-09-01', now).deadline).toBe('2026-10-01');
  });

  it('기한이 지나면 overdue', () => {
    const r = reportRequired(70_000_000, 0, '2026-07-01', now);
    expect(r.deadline).toBe('2026-07-31');
    expect(r.overdue).toBe(true);
  });

  it('기한 당일은 아직 지나지 않았다', () => {
    expect(reportRequired(70_000_000, 0, '2026-08-09', now).overdue).toBe(false);
  });

  it('계약일이 없으면 기한도 없다', () => {
    const r = reportRequired(70_000_000, 0, undefined, now);
    expect(r.deadline).toBeNull();
    expect(r.overdue).toBe(false);
  });
});

describe('addDays', () => {
  it('월말을 넘긴다', () => {
    expect(addDays('2026-01-31', 30)).toBe('2026-03-02');
  });

  it('잘못된 날짜는 던진다', () => {
    expect(() => addDays('없는날짜', 30)).toThrow();
  });
});
