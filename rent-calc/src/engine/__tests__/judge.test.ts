/** 갱신 판정 — FUNCTIONAL_SPEC 3-3 AC */
import { describe, expect, it } from 'vitest';
import { convertOnly, judgeRenewal, withinOneYearOf } from '../judge';
import type { JudgeInput } from '@/types';

/** 기준금리 3.00% → 법정 전환율 5.00% */
const input = (
  current: [number, number],
  proposed: [number, number],
  extra: Partial<JudgeInput> = {},
): JudgeInput => ({
  mode: 'renew',
  current: { deposit: current[0], rent: current[1] },
  proposed: { deposit: proposed[0], rent: proposed[1] },
  baseRate: 0.03,
  ...extra,
});

describe('judgeRenewal — 전세 → 전세', () => {
  it('1억 → 1억 500만: 정확히 5%, 상한 안', () => {
    const r = judgeRenewal(input([100_000_000, 0], [105_000_000, 0]));
    expect(r.increase).toBeCloseTo(0.05, 10);
    expect(r.verdict).toBe('within');
    expect(r.excessEq).toBe(0);
  });

  it('1억 → 1억 600만: 초과. 초과분을 보증금·월세로 환산', () => {
    const r = judgeRenewal(input([100_000_000, 0], [106_000_000, 0]));
    expect(r.verdict).toBe('exceeds');
    expect(r.increase).toBeCloseTo(0.06, 10);
    expect(r.excessAsDeposit).toBe(1_000_000);
    expect(r.excessAsRent).toBe(4_167);
  });
});

describe('judgeRenewal — 전세 → 반전세', () => {
  it('1억 → 5,000만 + 월 20만: 환산 9,800만이라 인하', () => {
    const r = judgeRenewal(input([100_000_000, 0], [50_000_000, 200_000]));
    expect(r.proposedEq).toBe(98_000_000);
    expect(r.increase).toBeCloseTo(-0.02, 10);
    expect(r.verdict).toBe('within');
  });

  it('1억 → 5,000만 + 월 25만: 10% 초과, 법정 최대 월세 229,167원', () => {
    const r = judgeRenewal(input([100_000_000, 0], [50_000_000, 250_000]));
    expect(r.proposedEq).toBe(110_000_000);
    expect(r.increase).toBeCloseTo(0.1, 10);
    expect(r.verdict).toBe('exceeds');
    // 부동산원·렌트홈 계산기와 같은 값 (docs/FACT_CHECK.md R1)
    expect(r.maxRentForProposedDeposit).toBe(229_167);
  });

  it('공공 계산기 값(229,167원)을 그대로 넣으면 상한 안이다 (경계 가드)', () => {
    // 반올림된 최대 월세를 입력하면 환산보증금은 상한을 80원 넘는다.
    // 월세 1원(= 환산 240원)까지는 초과로 보지 않으므로 within.
    const r = judgeRenewal(input([100_000_000, 0], [50_000_000, 229_167]));
    expect(r.verdict).toBe('within');
    expect(r.excessEq).toBe(0);
  });

  it('가드는 월세 1원까지만 봐준다 — 월 1,000원을 더 부르면 초과', () => {
    const r = judgeRenewal(input([100_000_000, 0], [50_000_000, 230_167]));
    expect(r.verdict).toBe('exceeds');
  });
});

describe('judgeRenewal — 반전세 → 반전세', () => {
  it('5,000만 + 30만 → 5,000만 + 31.5만: 환산 2.95% (항목별 월세는 5%)', () => {
    const r = judgeRenewal(input([50_000_000, 300_000], [50_000_000, 315_000]));
    expect(r.increase * 100).toBeCloseTo(2.95, 2);
    expect(r.verdict).toBe('within');
    expect(r.itemIncrease.rent).toBeCloseTo(0.05, 10);
    expect(r.itemIncrease.deposit).toBeCloseTo(0, 10);
  });

  it('3,000만 + 50만 → 1,000만 + 60만 (기준금리 2.75%): 3.37%', () => {
    const r = judgeRenewal(
      input([30_000_000, 500_000], [10_000_000, 600_000], { baseRate: 0.0275 }),
    );
    expect(r.legalRate).toBeCloseTo(0.0475, 10);
    expect(r.increase * 100).toBeCloseTo(3.37, 2);
    expect(r.verdict).toBe('within');
  });
});

describe('judgeRenewal — 법정 최대치 경계', () => {
  it('제안 보증금이 허용 환산보증금을 넘으면 최대 월세가 null', () => {
    const r = judgeRenewal(input([100_000_000, 0], [120_000_000, 0]));
    expect(r.verdict).toBe('exceeds');
    expect(r.maxRentForProposedDeposit).toBeNull();
    expect(r.maxDepositForProposedRent).toBe(105_000_000);
  });

  it('제안 월세만으로 넘으면 최대 보증금이 null', () => {
    const r = judgeRenewal(input([100_000_000, 0], [0, 500_000]));
    expect(r.maxDepositForProposedRent).toBeNull();
    expect(r.maxRentForProposedDeposit).toBe(437_500);
  });

  it('보증금 전액 월세 전환 상한 (제안 보증금 0)', () => {
    const r = judgeRenewal(input([100_000_000, 0], [0, 0]));
    expect(r.maxRentForProposedDeposit).toBe(437_500);
  });
});

describe('judgeRenewal — 1년 제한', () => {
  const now = new Date('2026-09-08T12:00:00');

  it('200일 전 증액이면 1년 미경과', () => {
    const r = judgeRenewal(
      input([100_000_000, 0], [105_000_000, 0], { lastChangeDate: '2026-02-20' }),
      now,
    );
    expect(r.withinOneYear).toBe(true);
  });

  it('400일 전이면 경과', () => {
    const r = judgeRenewal(
      input([100_000_000, 0], [105_000_000, 0], { lastChangeDate: '2025-08-05' }),
      now,
    );
    expect(r.withinOneYear).toBe(false);
  });

  it('입력이 없으면 null', () => {
    expect(judgeRenewal(input([100_000_000, 0], [105_000_000, 0]), now).withinOneYear).toBeNull();
  });

  it('withinOneYearOf: 정확히 365일 전은 경과', () => {
    expect(withinOneYearOf('2025-09-08', now)).toBe(false);
    expect(withinOneYearOf('2025-09-09', now)).toBe(true);
  });
});

describe('convertOnly — 신규 계약', () => {
  it('판정하지 않고 환산 참고치만 낸다', () => {
    const r = convertOnly({ deposit: 100_000_000, rent: 0 }, 0.03);
    expect(r.verdict).toBeNull();
    expect(r.mode).toBe('new');
    expect(r.rentIfAllDeposit).toBe(416_667);
    expect(r.depositIfAllRent).toBe(0);
  });

  it('월세를 보증금으로 환산', () => {
    const r = convertOnly({ deposit: 0, rent: 500_000 }, 0.03);
    expect(r.depositIfAllRent).toBe(120_000_000);
  });
});
