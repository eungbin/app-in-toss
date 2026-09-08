/**
 * legal.json ↔ constants.ts 일치.
 * 법령 값을 코드 리터럴로만 두면 출처가 사라지므로, 상수는 데이터 파일과 같아야 한다.
 */
import { describe, expect, it } from 'vitest';
import { legal } from '@/data';
import * as C from '@/constants';
import type { LegalKey } from '@/types';

const expected: Record<LegalKey, number> = {
  increaseCap: C.INCREASE_CAP,
  increaseIntervalDays: C.INCREASE_INTERVAL_DAYS,
  conversionCeiling: C.CONVERSION_CEILING,
  conversionSpread: C.CONVERSION_SPREAD,
  rentMultiplier: C.RENT_MULTIPLIER,
  rentMultiplierUnder50m: C.RENT_MULTIPLIER_UNDER_50M,
  rentMultiplierThreshold: C.RENT_MULTIPLIER_THRESHOLD,
  officetelAreaMax: C.OFFICETEL_AREA_MAX,
  officetelOtherRatio: C.OFFICETEL_OTHER_RATIO,
  reportDeposit: C.REPORT_DEPOSIT,
  reportRent: C.REPORT_RENT,
  reportDays: C.REPORT_DAYS,
};

describe('legal.json', () => {
  it('12개 항목이 모두 있다', () => {
    expect(legal.items).toHaveLength(12);
  });

  it('상수와 값이 같다', () => {
    for (const item of legal.items) {
      expect(item.value, item.key).toBeCloseTo(expected[item.key], 10);
    }
  });

  it('항목마다 조문·URL·확인일이 있다', () => {
    for (const item of legal.items) {
      expect(item.law, item.key).toMatch(/법|령|규칙/);
      expect(item.url, item.key).toMatch(/^https:\/\/www\.law\.go\.kr\//);
      expect(item.verifiedAt, item.key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
