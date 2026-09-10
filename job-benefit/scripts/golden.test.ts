/**
 * 골든 테스트 — docs/FACT_CHECK.md
 *
 * 기대값은 **구현 코드를 거치지 않는 경로**로 만들었다. 각 케이스의 주석에 원문 산식과
 * 숫자 리터럴 산술을 그대로 적어 두었다. 산식의 근거는 FACT_CHECK.md 1장에 있다.
 *
 * 남은 일: 이 표 전건을 고용보험 모의계산 결과와 대조한다(FACT_CHECK 3장, O-5).
 */
import { describe, expect, it } from 'vitest';
import { calculate } from '../src/engine';
import type { Input, StdHoursBasis } from '../src/types';

const TODAY = '2026-10-01';
const WEEK40: StdHoursBasis = { kind: 'week', hours: 40, paidHolidayHours: 8 };

const make = (o: Partial<Input>): Input => ({
  reason: 'involuntary',
  ageAtQuit: 45,
  disabled: false,
  hiredDate: '2023-03-01',
  quitDate: '2026-09-30',
  stdHours: WEEK40,
  wageTotal3m: 9_000_000,
  ...o,
});

interface Golden {
  id: string;
  why: string;
  input: Partial<Input>;
  daily: number;
  days: number;
  total: number;
}

const CASES: Golden[] = [
  {
    id: 'G1',
    why: '월 300만 · 주 40h · 45세 · 3~5년. 평균 9,000,000÷92 = 97,826.08…,'
      + ' 60% = 58,695.65 < 최저구직급여일액 82,560×0.8 = 66,048 → 66,048 (법 제46조②)',
    input: {},
    daily: 66_048,
    days: 180,
    total: 11_888_640, // 66,048 × 180
  },
  {
    id: 'G2',
    why: '월 400만 · 52세 · 10년 이상. 평균 130,434.78 > 상한 113,500 → 113,500 × 0.6 = 68,100',
    input: { wageTotal3m: 12_000_000, ageAtQuit: 52, hiredDate: '2016-01-01' },
    daily: 68_100,
    days: 270,
    total: 18_387_000, // 68,100 × 270 — 이 앱이 낼 수 있는 최대 총액
  },
  {
    id: 'G3',
    why: '월 120만 · 주 20h · 35세 · 1~3년. 1일 소정 (20+4)÷48×8 = 4h,'
      + ' 최저기초 4×10,320 = 41,280 > 평균 39,130.43 → 41,280 × 0.8 = 33,024 (법 제46조①2)',
    input: {
      wageTotal3m: 3_600_000, ageAtQuit: 35, hiredDate: '2025-01-01',
      stdHours: { kind: 'week', hours: 20, paidHolidayHours: 4 },
    },
    daily: 33_024,
    days: 150,
    total: 4_953_600, // 33,024 × 150
  },
  {
    id: 'G6',
    why: '월 250만 · 49세 · 10년 이상. 평균 81,521.73 < 최저기초 82,560 → 82,560 × 0.8 = 66,048.'
      + ' 49세이므로 50세 미만 행(240일)',
    input: { wageTotal3m: 7_500_000, ageAtQuit: 49, hiredDate: '2016-09-30' },
    daily: 66_048,
    days: 240,
    total: 15_851_520, // 66,048 × 240
  },
  {
    id: 'G7',
    why: '월 80만 · 주 15h · 28세 · 1년 미만. 1일 소정 (15+3)÷48×8 = 3h,'
      + ' 최저기초 30,960 > 평균 26,086.95 → 30,960 × 0.8 = 24,768',
    input: {
      wageTotal3m: 2_400_000, ageAtQuit: 28, hiredDate: '2026-06-01',
      stdHours: { kind: 'week', hours: 15, paidHolidayHours: 3 },
    },
    daily: 24_768,
    days: 120,
    total: 2_972_160, // 24,768 × 120
  },
  {
    id: 'G8',
    why: '통상임금 보정 — 평균 97,826.08 < 통상 111,000 → 111,000 × 0.6 = 66,600 (법 제45조②)',
    input: { ordinaryDaily: 111_000 },
    daily: 66_600,
    days: 180,
    total: 11_988_000, // 66,600 × 180
  },
  {
    id: 'G10',
    why: '월 337만 — 변동 구간 바로 아래. 평균 10,110,000÷92 = 109,891.30,'
      + ' 60% = 65,934.78 < 66,048 → 하한',
    input: { wageTotal3m: 10_110_000 },
    daily: 66_048,
    days: 180,
    total: 11_888_640,
  },
  {
    id: 'G11',
    why: '월 345만 — 변동 구간 안. 평균 10,350,000÷92 = 112,500 정확, 60% = 67,500',
    input: { wageTotal3m: 10_350_000 },
    daily: 67_500,
    days: 180,
    total: 12_150_000, // 67,500 × 180
  },
  {
    id: 'V1',
    why: '관공서 대조 — 3개월 총액 10,200,316 ÷ 92 = 110,873 정확, ×0.6 = 66,523.8 → 66,523.'
      + ' 고용보험 모의계산 2026-09-11 조회 결과와 일치',
    input: { wageTotal3m: 10_200_316 },
    daily: 66_523,
    days: 180,
    // 66,523.8 × 180. 표시 일액(66,523) × 180 = 11,974,140 과 다르다 — 관공서 화면값이 이쪽이다
    total: 11_974_284,
  },
  {
    id: 'V2',
    why: '관공서 대조 — 총액 10,200,350 ÷ 92 = 110,873.37. 평균을 먼저 버려 110,873 으로 보고'
      + ' ×0.6 = 66,523. 소수를 유지하면 66,524 가 되어 1원 어긋난다',
    input: { wageTotal3m: 10_200_350 },
    daily: 66_523,
    days: 180,
    total: 11_974_284,
  },
  {
    id: 'V3',
    why: '관공서 대조 — 월 400만(총 12,000,000). 평균 130,434 > 상한 113,500 → 68,100.'
      + ' 관공서 안내 문구는 상한을 66,000원으로 적어 두었지만 계산은 68,100 을 낸다',
    input: { wageTotal3m: 12_000_000 },
    daily: 68_100,
    days: 180,
    total: 12_258_000,
  },
  {
    id: 'G12',
    why: '장애인 45세 · 10년 이상 → 50세 이상 행으로 270일 (별표 1 비고)',
    input: { disabled: true, hiredDate: '2016-01-01' },
    daily: 66_048,
    days: 270,
    total: 17_832_960, // 66,048 × 270
  },
  {
    id: 'G13',
    why: '월 단위 소정근로 — (174+35)÷209×8 = 8h. G1 과 같은 결과가 나와야 한다',
    input: { stdHours: { kind: 'month', hours: 174, paidHolidayHours: 35 } },
    daily: 66_048,
    days: 180,
    total: 11_888_640,
  },
];

describe('골든 — 원문 산술로 만든 기대값', () => {
  for (const c of CASES) {
    it(`${c.id} ${c.why}`, () => {
      const r = calculate(make(c.input), TODAY);
      expect(r.benefitDaily).toBe(c.daily);
      expect(r.benefitDays).toBe(c.days);
      expect(r.total).toBe(c.total);
  
    });
  }

  it('일액은 상한과 하한 사이에 있다 — 8시간 근로자는 66,048 ~ 68,100', () => {
    for (const wage of [1_000_000, 3_000_000, 5_000_000, 20_000_000]) {
      const r = calculate(make({ wageTotal3m: wage * 3 }), TODAY);
      expect(r.benefitDaily).toBeGreaterThanOrEqual(66_048);
      expect(r.benefitDaily).toBeLessThanOrEqual(68_100);
    }
  });

  it('대기기간 7일은 총액을 줄이지 않는다 — 법 제49조·제50조①', () => {
    const r = calculate(make({}), TODAY);
    expect(r.total).toBe(r.benefitDaily * r.benefitDays);
  });
});
