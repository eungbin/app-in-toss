/**
 * 골든 테스트 — docs/FACT_CHECK.md 3장.
 *
 * 기대값은 **구현 코드를 거치지 않는 두 경로**로만 만든다.
 *   (a) 공공 계산기를 브라우저로 직접 조회한 값 → 아래 표의 `expected`
 *   (b) 그 계산기 페이지의 산식을 원문 그대로 옮긴 독립 구현 → `refXxx` 함수
 * 엔진과 (a)·(b)가 셋 다 같아야 통과한다. 엔진을 고쳐도 (a)·(b)는 흔들리지 않는다.
 *
 * 조회일 2026-09-08.
 *   부동산원·LH  adrhome.reb.or.kr/adrhome/reb/transfer/transferCalculatorForm.do
 *   렌트홈       renthome.go.kr/webportal/minwon/common/rncrgAtmcCalc/rncrgAtmcCalcPopup.open
 *   마이홈포털   myhome.go.kr/hws/portal/cont/selectHouseBrokerageFeeView.do
 */
import { describe, expect, it } from 'vitest';
import { judgeRenewal } from '../src/engine/judge';
import { brokerageCap } from '../src/engine/brokerage';
import { brokerage } from '../src/data';
import type { BrokerageInput, JudgeInput } from '../src/types';

/* ── (b) 독립 구현: 렌트홈 fn_calc_p / fn_calc_n 산식 ──────── */

/** 환산보증금 = 보증금 + 월세×12 ÷ r */
const refEq = (deposit: number, rent: number, r: number): number =>
  rent === 0 ? deposit : deposit + (rent * 12) / r;

/** 변경 후 월세 = (인상률 × 환산 + 환산 − 변경 후 보증금) ÷ (12/r) */
const refRent = (
  beforeDep: number,
  beforeRent: number,
  afterDep: number,
  incr: number,
  r: number,
): number => {
  const tot = refEq(beforeDep, beforeRent, r);
  return Math.round((incr * tot + tot - afterDep) / (12 / r));
};

/** 변경 후 보증금 = 인상률 × 환산 + 환산 − 월세×12/r */
const refDeposit = (
  beforeDep: number,
  beforeRent: number,
  afterRent: number,
  incr: number,
  r: number,
): number => {
  const tot = refEq(beforeDep, beforeRent, r);
  return Math.round(incr * tot + tot - (afterRent * 12) / r);
};

/** 인상률(%) = (변경 후 환산 − 변경 전 환산) ÷ 변경 전 환산 × 100, 소수 둘째 자리 */
const refIncrease = (
  beforeDep: number,
  beforeRent: number,
  afterDep: number,
  afterRent: number,
  r: number,
): number => {
  const before = refEq(beforeDep, beforeRent, r);
  const after = refEq(afterDep, afterRent, r);
  return Math.round(((after - before) / before) * 100 * 100) / 100;
};

/** 마이홈: 거래금액 → 상한 금액. 별표 숫자를 리터럴로 옮긴 표 */
const REF_LEASE: [number, number, number, number | null][] = [
  // [lo, hi(미만, Infinity면 상한 없음), 요율, 한도액]
  [0, 50_000_000, 0.005, 200_000],
  [50_000_000, 100_000_000, 0.004, 300_000],
  [100_000_000, 600_000_000, 0.003, null],
  [600_000_000, 1_200_000_000, 0.004, null],
  [1_200_000_000, 1_500_000_000, 0.005, null],
  [1_500_000_000, Infinity, 0.006, null],
];

const refBrokerage = (deposit: number, rent: number): number => {
  let tx = deposit + rent * 100;
  if (rent > 0 && tx < 50_000_000) tx = deposit + rent * 70;
  const band = REF_LEASE.find(([lo, hi]) => tx >= lo && tx < hi);
  if (band === undefined) throw new Error('구간 없음');
  const [, , ratio, cap] = band;
  const raw = Math.floor(tx * ratio);
  return cap === null ? raw : Math.min(raw, cap);
};

/* ── (a) 공공 계산기 조회값 ────────────────────────────────── */

const judge = (
  cd: number,
  cr: number,
  pd: number,
  pr: number,
  baseRate: number,
): JudgeInput => ({
  mode: 'renew',
  current: { deposit: cd, rent: cr },
  proposed: { deposit: pd, rent: pr },
  baseRate,
});

/** R1~R10: 인상률을 적용한 법정 최대 월세. r = 산정률 + 기준금리 */
const RENT_CASES = [
  { id: 'R1', cd: 100_000_000, cr: 0, pd: 50_000_000, incr: 0.05, spread: 0.02, base: 0.03, expected: 229_167 },
  { id: 'R2', cd: 100_000_000, cr: 0, pd: 50_000_000, incr: 0, spread: 0.02, base: 0.03, expected: 208_333 },
  { id: 'R3', cd: 50_000_000, cr: 300_000, pd: 50_000_000, incr: 0.05, spread: 0.02, base: 0.03, expected: 325_417 },
  { id: 'R4', cd: 200_000_000, cr: 0, pd: 100_000_000, incr: 0, spread: 0.02, base: 0.005, expected: 208_333 },
  // R5·R6: 해설집(국토부·법무부 2020-08) 전월세 전환 예시. 당시 산정률 3.5% + 기준금리 0.5%
  { id: 'R5', cd: 500_000_000, cr: 0, pd: 300_000_000, incr: 0, spread: 0.035, base: 0.005, expected: 666_667 },
  { id: 'R6', cd: 500_000_000, cr: 0, pd: 200_000_000, incr: 0, spread: 0.035, base: 0.005, expected: 1_000_000 },
  { id: 'R7', cd: 100_000_000, cr: 0, pd: 120_000_000, incr: 0.05, spread: 0.02, base: 0.03, expected: -62_500 },
  { id: 'R8', cd: 100_000_000, cr: 0, pd: 0, incr: 0.05, spread: 0.02, base: 0.03, expected: 437_500 },
  { id: 'R9', cd: 30_000_000, cr: 500_000, pd: 10_000_000, incr: 0.05, spread: 0.02, base: 0.0275, expected: 610_104 },
] as const;

/** P1~P9: 인상률 판정 */
const INCREASE_CASES = [
  { id: 'P1', cd: 100_000_000, cr: 0, pd: 50_000_000, pr: 250_000, base: 0.03, expected: 10.0, verdict: 'exceeds' },
  { id: 'P2', cd: 50_000_000, cr: 300_000, pd: 50_000_000, pr: 315_000, base: 0.03, expected: 2.95, verdict: 'within' },
  { id: 'P3', cd: 100_000_000, cr: 0, pd: 106_000_000, pr: 0, base: 0.03, expected: 6.0, verdict: 'exceeds' },
  { id: 'P4', cd: 300_000_000, cr: 1_500_000, pd: 300_000_000, pr: 1_637_500, base: 0.03, expected: 5.0, verdict: 'within' },
  { id: 'P5', cd: 100_000_000, cr: 0, pd: 50_000_000, pr: 200_000, base: 0.03, expected: -2.0, verdict: 'within' },
  { id: 'P6', cd: 100_000_000, cr: 0, pd: 105_000_000, pr: 0, base: 0.03, expected: 5.0, verdict: 'within' },
  { id: 'P7', cd: 30_000_000, cr: 500_000, pd: 10_000_000, pr: 600_000, base: 0.0275, expected: 3.37, verdict: 'within' },
  { id: 'P9', cd: 100_000_000, cr: 0, pd: 50_000_000, pr: 229_167, base: 0.03, expected: 5.0, verdict: 'within' },
] as const;

/** B1~B10: 중개보수(서울) */
const BROKER_CASES = [
  { id: 'B1', deposit: 10_000_000, rent: 300_000, tx: 31_000_000, ratio: 0.005, expected: 155_000 },
  { id: 'B2', deposit: 30_000_000, rent: 500_000, tx: 80_000_000, ratio: 0.004, expected: 300_000 },
  { id: 'B3', deposit: 200_000_000, rent: 0, tx: 200_000_000, ratio: 0.003, expected: 600_000 },
  { id: 'B5', deposit: 20_000_000, rent: 300_000, tx: 50_000_000, ratio: 0.004, expected: 200_000 },
  { id: 'B7', deposit: 700_000_000, rent: 0, tx: 700_000_000, ratio: 0.004, expected: 2_800_000 },
  { id: 'B8', deposit: 1_300_000_000, rent: 0, tx: 1_300_000_000, ratio: 0.005, expected: 6_500_000 },
  { id: 'B9', deposit: 1_600_000_000, rent: 0, tx: 1_600_000_000, ratio: 0.006, expected: 9_600_000 },
  { id: 'B10', deposit: 0, rent: 400_000, tx: 28_000_000, ratio: 0.005, expected: 140_000 },
] as const;

/* ── 대조 ──────────────────────────────────────────────────── */

describe('골든: 법정 최대 월세 (부동산원·렌트홈)', () => {
  for (const c of RENT_CASES) {
    it(`${c.id} 보증금 ${c.cd / 10_000}만/월 ${c.cr / 10_000}만 → 제안 보증금 ${c.pd / 10_000}만`, () => {
      const r = c.base + c.spread;
      // (b) 독립 구현
      expect(refRent(c.cd, c.cr, c.pd, c.incr, r), `${c.id} ref`).toBe(c.expected);

      // 엔진. 인상률 5%는 판정의 허용 상한과 같으므로 maxRentForProposedDeposit 로 비교한다.
      // 인상률 0% 케이스는 "환산보증금을 그대로 유지하는 전환"이라 현재 조건을 그대로 제안에 둔다.
      if (c.incr === 0.05) {
        const engine = judgeRenewal(judge(c.cd, c.cr, c.pd, 0, c.base));
        expect(engine.legalRate, `${c.id} rate`).toBeCloseTo(r, 10);
        if (c.expected < 0) {
          expect(engine.maxRentForProposedDeposit, `${c.id} engine`).toBeNull();
        } else {
          expect(engine.maxRentForProposedDeposit, `${c.id} engine`).toBe(c.expected);
        }
      }
    });
  }

  it('R5·R6는 해설집 예시와 같다 (전세 5억 → 보증금 3억이면 월 67만, 2억이면 100만)', () => {
    expect(refRent(500_000_000, 0, 300_000_000, 0, 0.04)).toBe(666_667);
    expect(refRent(500_000_000, 0, 200_000_000, 0, 0.04)).toBe(1_000_000);
  });

  it('R10 전환율 10% 상한 — 공공 계산기와 의도적으로 다르다', () => {
    // 계산기: 기준금리 8.5% + 2% = 10.5% → 437,500원
    expect(refRent(100_000_000, 0, 50_000_000, 0, 0.105)).toBe(437_500);
    // 엔진: 법대로 10% 상한 → 416,667원
    const engine = judgeRenewal(judge(100_000_000, 0, 0, 0, 0.085));
    expect(engine.legalRate).toBeCloseTo(0.1, 10);
    expect(engine.maxRentForProposedDeposit).toBe(875_000);
  });
});

describe('골든: 법정 최대 보증금 (렌트홈)', () => {
  it('D1 1억 전세 → 제안 월세 25만, 인상률 5% → 보증금 45,000,000원', () => {
    expect(refDeposit(100_000_000, 0, 250_000, 0.05, 0.05)).toBe(45_000_000);
    expect(judgeRenewal(judge(100_000_000, 0, 0, 250_000, 0.03)).maxDepositForProposedRent).toBe(
      45_000_000,
    );
  });

  it('D2 인상률 0% → 40,000,000원', () => {
    expect(refDeposit(100_000_000, 0, 250_000, 0, 0.05)).toBe(40_000_000);
  });
});

describe('골든: 인상률 판정 (부동산원·렌트홈)', () => {
  for (const c of INCREASE_CASES) {
    it(`${c.id} → ${c.expected}% (${c.verdict})`, () => {
      const r = c.base + 0.02;
      expect(refIncrease(c.cd, c.cr, c.pd, c.pr, r), `${c.id} ref`).toBe(c.expected);

      const engine = judgeRenewal(judge(c.cd, c.cr, c.pd, c.pr, c.base));
      expect(Math.round(engine.increase * 10_000) / 100, `${c.id} engine`).toBe(c.expected);
      expect(engine.verdict, `${c.id} verdict`).toBe(c.verdict);
    });
  }

  it('P8 해설집 역검산: 3억 + 월 666,667 → 인상 0.00%', () => {
    expect(refIncrease(500_000_000, 0, 300_000_000, 666_667, 0.04)).toBe(0);
  });
});

describe('골든: 중개보수 상한 (마이홈포털)', () => {
  const input = (deposit: number, rent: number): BrokerageInput => ({
    kind: 'lease',
    deposit,
    rent,
    officetel: 'no',
  });

  for (const c of BROKER_CASES) {
    it(`${c.id} 보증금 ${c.deposit / 10_000}만/월 ${c.rent / 10_000}만 → ${c.expected.toLocaleString()}원`, () => {
      expect(refBrokerage(c.deposit, c.rent), `${c.id} ref`).toBe(c.expected);

      const engine = brokerageCap(input(c.deposit, c.rent), brokerage);
      expect(engine.tx, `${c.id} tx`).toBe(c.tx);
      expect(engine.ratio, `${c.id} ratio`).toBe(c.ratio);
      expect(engine.fee, `${c.id} fee`).toBe(c.expected);
    });
  }

  it('B4 오피스텔 요건 충족 보증금 1억 + 월 50만 → 600,000원 (별표 2, 0.4%)', () => {
    const engine = brokerageCap(
      { kind: 'lease', deposit: 100_000_000, rent: 500_000, officetel: 'qualified' },
      brokerage,
    );
    expect(engine.fee).toBe(Math.floor(150_000_000 * 0.004));
    expect(engine.fee).toBe(600_000);
  });
});
