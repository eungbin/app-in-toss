/** 단위 테스트 — docs/FUNCTIONAL_SPEC.md §3 의 AC 를 그대로 옮겼다 */
import { describe, expect, it } from 'vitest';
import {
  averageDaily, baseDaily, benefitDaily, benefitDays, calculate, curve, defaultPaidHolidayHours,
  earlyBonus, eligibility, insuredBand, minBaseDaily, periodDays, stdDayHours, tenureDays, tenureYearsMonths,
} from '..';
import type { Input } from '../../types';

const MW26 = 10_320;

describe('§3-1 stdDayHours — 시행규칙 제91조의2', () => {
  it('AC-1 일 단위는 그대로', () => expect(stdDayHours({ kind: 'day', hours: 6 })).toBe(6));
  it('AC-2 주 40 + 주휴 8 → 8', () =>
    expect(stdDayHours({ kind: 'week', hours: 40, paidHolidayHours: 8 })).toBe(8));
  it('AC-3 주 20 + 주휴 4 → 4', () =>
    expect(stdDayHours({ kind: 'week', hours: 20, paidHolidayHours: 4 })).toBe(4));
  it('AC-4 주 15 + 주휴 3 → 3', () =>
    expect(stdDayHours({ kind: 'week', hours: 15, paidHolidayHours: 3 })).toBe(3));
  it('AC-5 월 174 + 주휴 35 → 8', () =>
    expect(stdDayHours({ kind: 'month', hours: 174, paidHolidayHours: 35 })).toBe(8));
  it('AC-6 4주 160 + 32 → 28로 나눈다(반올림하지 않는다)', () =>
    expect(stdDayHours({ kind: 'varies4w', hours4w: 160, paidHolidayHours4w: 32 })).toBeCloseTo(192 / 28, 10));

  it('주휴 기본값 — 주 40시간이면 8, 주 20시간이면 4, 주 15시간 미만은 0', () => {
    expect(defaultPaidHolidayHours(40)).toBe(8);
    expect(defaultPaidHolidayHours(20)).toBe(4);
    expect(defaultPaidHolidayHours(14)).toBe(0);
    expect(defaultPaidHolidayHours(48)).toBe(8); // 40시간을 넘어도 주휴는 8시간이 상한
  });
});

describe('§3-2 averageDaily · 산정 기간', () => {
  it('AC-1 9,000,000 / 92', () => expect(averageDaily(9_000_000, 92)).toBeCloseTo(97_826.0869565, 6));
  it('AC-2 9,000,000 / 91', () => expect(averageDaily(9_000_000, 91)).toBeCloseTo(98_901.0989011, 6));
  it('AC-3 기간이 0 이하면 throw', () => expect(() => averageDaily(1, 0)).toThrow());

  it('이직일 직전 3개월의 일수', () => {
    expect(periodDays('2026-09-30')).toBe(92); // 06-30 ~ 09-29
    expect(periodDays('2026-03-01')).toBe(90); // 12-01 ~ 02-28
    expect(periodDays('2024-03-01')).toBe(91); // 윤년
  });
});

describe('§3-3 baseDaily — 법 제45조 순서대로', () => {
  const minBase8 = minBaseDaily(8, MW26); // 82,560
  it('AC-1 조정 없음 — 평균임금을 원 단위로 버린다', () => {
    const r = baseDaily(97_826.0869565, minBase8);
    expect(r.baseDaily).toBe(97_826);
    expect(r.applied).toEqual([]);
  });
  it('AC-1b 절사는 버림이고 평균에 먼저 적용된다 (관공서 대조)', () => {
    // 평균 110,873.37 → 기초일액 110,873 → ×0.6 = 66,523.8 → 66,523
    // 소수를 유지하면 66,524.02 → 66,524 로 1원 어긋난다
    const r = baseDaily(10_200_350 / 92, minBase8);
    expect(r.baseDaily).toBe(110_873);
    expect(benefitDaily(r.baseDaily, minBase8, r.applied).benefitDaily).toBe(66_523);
  });
  it('AC-2 상한', () => {
    const r = baseDaily(130_434.78, minBase8);
    expect(r.baseDaily).toBe(113_500);
    expect(r.applied).toEqual(['cap']);
  });
  it('AC-3 최저기초일액 (1일 4시간)', () => {
    const minBase4 = minBaseDaily(4, MW26); // 41,280
    const r = baseDaily(39_130.43, minBase4);
    expect(r.baseDaily).toBe(41_280);
    expect(r.applied).toEqual(['minBase']);
  });
  it('AC-4 통상임금 보정', () => {
    const r = baseDaily(97_826.0869565, minBase8, 111_000);
    expect(r.baseDaily).toBe(111_000);
    expect(r.applied).toEqual(['ordinary']);
  });
  it('AC-5 통상임금 보정 뒤 상한', () => {
    const r = baseDaily(97_826.0869565, minBase8, 120_000);
    expect(r.baseDaily).toBe(113_500);
    expect(r.applied).toEqual(['ordinary', 'cap']);
  });
});

describe('§3-4 benefitDaily — 법 제46조', () => {
  const minBase8 = minBaseDaily(8, MW26); // 82,560 → 최저구직급여일액 66,048
  const of = (base: number, minBase = minBase8, applied: Parameters<typeof benefitDaily>[2] = []) =>
    benefitDaily(base, minBase, applied);

  it('AC-1 60%가 하한보다 낮으면 하한', () => {
    const r = of(97_826.0869565);
    expect(r.benefitDaily).toBe(66_048);
    expect(r.applied).toContain('minDaily');
  });
  it('AC-2 상한 기초일액', () => expect(of(113_500).benefitDaily).toBe(68_100));
  it('AC-3 최저기초일액 적용(4시간)', () => {
    const minBase4 = minBaseDaily(4, MW26);
    expect(of(minBase4, minBase4, ['minBase']).benefitDaily).toBe(33_024);
  });
  it('AC-4 경계 — 60%가 하한과 정확히 같아지는 지점', () =>
    expect(of(110_080).benefitDaily).toBe(66_048));
  it('AC-5 하한 돌파 첫 구간', () => expect(of(110_100).benefitDaily).toBe(66_060));
  it('AC-6 변동 구간', () => expect(of(112_500).benefitDaily).toBe(67_500));
  it('AC-7 3시간 근로자', () => {
    const minBase3 = minBaseDaily(3, MW26); // 30,960
    expect(of(minBase3, minBase3, ['minBase']).benefitDaily).toBe(24_768);
  });
  it('AC-8 불변식 — min(max(60%, 하한 80%), 상한 60%). 기초일액은 이미 원 단위다', () => {
    for (let base = 20_000; base <= 113_500; base += 137) {
      for (const hours of [3, 4, 8]) {
        const mb = minBaseDaily(hours, MW26);
        const applied = base <= mb ? (['minBase'] as const) : ([] as const);
        const got = benefitDaily(Math.max(base, mb), mb, applied).benefitDaily;
        const want = Math.floor(Math.min(Math.max(Math.max(base, mb) * 0.6, mb * 0.8), 113_500 * 0.6));
        expect(got).toBe(want);
      }
    }
  });
});

describe('§3-5 benefitDays — 별표 1', () => {
  it('AC-1 50세 미만', () => {
    expect(['lt1', 'y1to3', 'y3to5', 'y5to10', 'gte10'].map((b) => benefitDays(false, b as never)))
      .toEqual([120, 150, 180, 210, 240]);
  });
  it('AC-2 50세 이상', () => {
    expect(['lt1', 'y1to3', 'y3to5', 'y5to10', 'gte10'].map((b) => benefitDays(true, b as never)))
      .toEqual([120, 180, 210, 240, 270]);
  });
  it('AC-3 장애인은 50세 이상으로 본다', () => expect(benefitDays(true, 'gte10')).toBe(270));

  it('피보험기간 구간 — 달력 기준 만 n년', () => {
    expect(insuredBand('2026-01-01', '2026-12-31')).toBe('lt1');
    expect(insuredBand('2025-01-01', '2026-01-01')).toBe('y1to3');
    expect(insuredBand('2023-03-01', '2026-09-30')).toBe('y3to5');
    expect(insuredBand('2021-01-01', '2026-09-30')).toBe('y5to10');
    expect(insuredBand('2016-09-30', '2026-09-30')).toBe('gte10');
  });
});

describe('§3-6 eligibility — 단정하지 않는다', () => {
  const base: Input = {
    reason: 'involuntary', ageAtQuit: 45, disabled: false,
    hiredDate: '2023-03-01', quitDate: '2026-09-30',
    stdHours: { kind: 'week', hours: 40, paidHolidayHours: 8 }, wageTotal3m: 9_000_000,
  };
  const TODAY = '2026-09-30';

  it('AC-1 비자발 + 재직 충분 → likely', () =>
    expect(eligibility(base, 1_309, TODAY).verdict).toBe('likely'));
  it('AC-2 재직 179일 → unlikely (추정값은 실제보다 크거나 같다)', () => {
    const r = eligibility(base, 179, TODAY);
    expect(r.verdict).toBe('unlikely');
    expect(r.reasons).toContain('insuredShort');
  });
  it('AC-2b 재직 180~209일 → check (무급휴직·결근이면 실제로는 미달할 수 있다)', () => {
    for (const d of [180, 195, 209]) {
      const r = eligibility(base, d, TODAY);
      expect(r.verdict).toBe('check');
      expect(r.reasons).toContain('insuredNear');
    }
    expect(eligibility(base, 210, TODAY).verdict).toBe('likely');
  });
  it('AC-3 자발 + 정당한 사유 없음 → unlikely', () =>
    expect(eligibility({ ...base, reason: 'voluntary' }, 1_309, TODAY).verdict).toBe('unlikely'));
  it('AC-4 자발 + 정당한 사유 → 항상 check', () => {
    const r = eligibility({ ...base, reason: 'voluntaryJustified', justifiedItem: '12' }, 1_309, TODAY);
    expect(r.verdict).toBe('check');
    expect(r.reasons).toContain('justifiedNeedsProof');
  });
  it('AC-5 이직일이 미래 → check', () =>
    expect(eligibility(base, 1_309, '2026-09-01').verdict).toBe('check'));
  it('나쁜 쪽이 이긴다 — 자발 + 재직 부족이면 unlikely', () =>
    expect(eligibility({ ...base, reason: 'voluntary' }, 100, TODAY).verdict).toBe('unlikely'));

  it('재직 일수', () => expect(tenureDays('2023-03-01', '2026-09-30')).toBe(1_309));
});

describe('§3-8 earlyBonus — 시행령 제84·85조', () => {
  it('AC-1 잔여 91 · 신고 후 30일', () =>
    expect(earlyBonus(66_048, 180, 91, 30)).toMatchObject({ eligible: true, amount: 3_005_184 }));
  it('AC-2 잔여 90 = 1/2 경계', () =>
    expect(earlyBonus(66_048, 180, 90, 30)).toMatchObject({ eligible: true, amount: 2_972_160 }));
  it('AC-3 잔여 89 → 부적격', () =>
    expect(earlyBonus(66_048, 180, 89, 30)).toMatchObject({ eligible: false, blockedBy: 'remainLessThanHalf' }));
  it('AC-4 신고 후 14일 이내 → 부적격', () =>
    expect(earlyBonus(66_048, 180, 120, 10)).toMatchObject({ eligible: false, blockedBy: 'within14days' }));
  it('14일 경계 — 14는 안 되고 15는 된다', () => {
    expect(earlyBonus(66_048, 180, 120, 14).eligible).toBe(false);
    expect(earlyBonus(66_048, 180, 120, 15).eligible).toBe(true);
  });
});

describe('§3-9 curve — 계단이 이 화면의 핵심', () => {
  const pts = curve(66_048, 180);
  it('AC-1 점의 개수 = 일수 + 1', () => expect(pts).toHaveLength(181));
  it('AC-2 paid 는 단조증가', () => {
    for (let i = 1; i < pts.length; i++) expect(pts[i]!.paid).toBeGreaterThan(pts[i - 1]!.paid);
  });
  it('AC-3 90일 → 8,916,480, 91일 → 6,010,368 (감소한다)', () => {
    expect(pts[90]).toMatchObject({ total: 8_916_480 });
    expect(pts[91]).toMatchObject({ total: 6_010_368 });
    expect(pts[91]!.total).toBeLessThan(pts[90]!.total);
  });
  it('총액이 감소하는 지점은 정확히 한 곳', () => {
    const drops = pts.filter((p, i) => i > 0 && p.total < pts[i - 1]!.total);
    expect(drops).toHaveLength(1);
    expect(drops[0]!.day).toBe(91);
  });
  it('수급 시작 직후 7일은 신고 후 14일이 지나지 않아 수당이 없다', () => {
    expect(pts[6]!.bonus).toBe(0);
    expect(pts[7]!.bonus).toBeGreaterThan(0);
  });
});

describe('총액 — 관공서 계산의 실체를 따른다', () => {
  it('버리기 전 일액으로 곱한다. 표시 일액 × 일수와 어긋나는 것이 정상이다', () => {
    const r = calculate(
      {
        reason: 'involuntary', ageAtQuit: 45, disabled: false,
        hiredDate: '2023-03-01', quitDate: '2026-09-30',
        stdHours: { kind: 'week', hours: 40, paidHolidayHours: 8 },
        wageTotal3m: 10_200_316,
      },
      '2026-10-01',
    );
    expect(r.benefitDaily).toBe(66_523);        // 화면 표시
    expect(r.benefitDailyExact).toBeCloseTo(66_523.8, 6);
    expect(r.total).toBe(11_974_284);           // 관공서 화면값
    expect(r.total).not.toBe(r.benefitDaily * r.benefitDays); // 11,974,140
  });

  it('하한·상한이 걸린 케이스는 두 값이 같다 — 소수가 없다', () => {
    for (const wage of [9_000_000, 12_000_000]) {
      const r = calculate(
        {
          reason: 'involuntary', ageAtQuit: 45, disabled: false,
          hiredDate: '2023-03-01', quitDate: '2026-09-30',
          stdHours: { kind: 'week', hours: 40, paidHolidayHours: 8 },
          wageTotal3m: wage,
        },
        '2026-10-01',
      );
      expect(r.total).toBe(r.benefitDaily * r.benefitDays);
    }
  });
});

describe('재직 기간 표시 — 달력으로 센다', () => {
  it('2023-03-01 ~ 2026-09-30 은 3년 6개월 (30일 나눗셈이면 7개월로 어긋난다)', () => {
    expect(tenureYearsMonths('2023-03-01', '2026-09-30')).toEqual({ years: 3, months: 6 });
  });
  it('하루 모자라면 그 달을 세지 않는다', () => {
    expect(tenureYearsMonths('2023-03-15', '2026-09-14')).toEqual({ years: 3, months: 5 });
    expect(tenureYearsMonths('2023-03-15', '2026-09-15')).toEqual({ years: 3, months: 6 });
  });
  it('같은 날이면 0', () => expect(tenureYearsMonths('2026-09-30', '2026-09-30')).toEqual({ years: 0, months: 0 }));
});
