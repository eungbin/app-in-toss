/**
 * 골든 케이스 31건 — docs/FACT_CHECK.md
 *
 * 1차 출처는 **소득세법 시행령 별표2 원문**(data-src/tax-table/2024-02-29.hwpx)이다.
 * 기대값을 코드로 계산해 넣으면 자기 자신을 검증하는 셈이 되므로,
 *  - 세액은 원문 텍스트에서 **파서와 다른 경로**(구간 경계로 직접 정규식)로 뽑아 쓰고,
 *  - 보험료는 고시 숫자를 테스트 안에 **리터럴 산술**로 다시 적어 대조한다.
 * 두 방식 모두 구현 코드를 거치지 않는다.
 *
 * 여기에 더해 G 그룹은 **국세청 홈택스 간이세액표 조회기**의 실제 결과와 맞춘다.
 * 원문과 무관한 완전히 독립된 출처이므로 파서·조회·절사가 한꺼번에 검증된다.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractText } from './hwpx';
import { lookupIncomeTax } from '../src/engine/tax';
import { computeNet } from '../src/engine/net';
import { TAX_TABLES } from '../src/data';
import type { CalcOptions, TaxTableFile } from '../src/types';

const ROOT = resolve(import.meta.dirname, '..');
const RAW = extractText(readFileSync(resolve(ROOT, 'data-src/tax-table/2024-02-29.hwpx')));

const TABLE = TAX_TABLES.find((t) => t.meta.effectiveFrom === '2024-02-29') as TaxTableFile;

/** 2026-03-01 시행판 — 국가법령정보센터 별표 평문 (│로 칸을 나눈다) */
const RAW26 = readFileSync(resolve(ROOT, 'data-src/tax-table/2026-03-01.txt'), 'utf-8');
const TABLE26 = TAX_TABLES.find((t) => t.meta.effectiveFrom === '2026-03-01') as TaxTableFile;

/** 2026 평문에서 한 행을 직접 읽는다. 파서(scripts/law-byl.ts)와 다른 경로 */
function rawRow26(loThousand: number, hiThousand: number): number[] {
  const want = [th(loThousand), th(hiThousand)];
  const hits: number[][] = [];
  for (const line of RAW26.split('\n')) {
    if (!line.includes('│')) continue;
    const cells = line.trim().replace(/^│|│$/g, '').split('│').map((c) => c.trim());
    if (cells[0] !== want[0] || cells[1] !== want[1] || cells.length < 13) continue;
    hits.push(cells.slice(2, 13).map((c) => (c === '-' ? 0 : Number(c.replace(/,/g, '')))));
  }
  expect(hits, `2026 원문에서 ${loThousand}~${hiThousand}천원 행을 한 번만 찾아야 한다`).toHaveLength(1);
  return hits[0] as number[];
}

const th = (n: number) => n.toLocaleString('en-US');

/**
 * 원문에서 "<이상> <미만> <11개 값>" 한 행을 직접 읽는다.
 * scripts/hwpx.ts 의 순차 파싱과 달리 구간 경계로 바로 찾으므로 파서 버그와 독립적이다.
 */
function rawRow(loThousand: number, hiThousand: number): number[] {
  const re = new RegExp(`(?:^| )${th(loThousand)} ${th(hiThousand)} ((?:(?:[\\d,]+|-) ){11})`, 'g');
  const found = [...RAW.matchAll(re)];
  expect(found, `원문에서 ${loThousand}~${hiThousand}천원 행을 한 번만 찾아야 한다`).toHaveLength(1);
  return (found[0]![1] as string)
    .trim()
    .split(/\s+/)
    .map((t) => (t === '-' ? 0 : Number(t.replace(/,/g, ''))));
}

/** 원문에서 표 상한(10,000천원)의 기준 세액 11개 */
function rawCapRow(): number[] {
  const re = /10,000천원 ((?:[\d,]+ ){11})10,000천원\s*초과/;
  const m = re.exec(RAW);
  expect(m, '원문에서 상한 기준 세액 행을 찾아야 한다').not.toBeNull();
  return (m![1] as string).trim().split(/\s+/).map((t) => Number(t.replace(/,/g, '')));
}

const look = (taxable: number, dependents: number, children = 0) =>
  lookupIncomeTax(TABLE, taxable, dependents, children);

/* ── A. 간이세액표 원문 대조 (8건) ───────────────────────────── */

describe('골든 A — 간이세액표 본문 (원문 직접 대조)', () => {
  it('1. 표 하한 직전 1,055~1,060천원 · 가족 1 → 원문 그대로 0원', () => {
    const row = rawRow(1_055, 1_060);
    expect(row[0]).toBe(0);
    expect(look(1_059_000, 1)).toBe(row[0]);
  });

  it('2. 세액이 처음 생기는 1,060~1,065천원 · 가족 1', () => {
    const row = rawRow(1_060, 1_065);
    expect(look(1_060_000, 1)).toBe(row[0]);
    expect(row[0]).toBeGreaterThan(0);
  });

  it('3. 같은 구간 상단 경계 1,064,999원 → 같은 값(구간은 "미만")', () => {
    const row = rawRow(1_060, 1_065);
    expect(look(1_064_999, 1)).toBe(row[0]);
    // 다음 구간은 값이 달라야 한다
    expect(look(1_065_000, 1)).toBe(rawRow(1_065, 1_070)[0]);
  });

  it('4. 2,000~2,010천원 · 가족 1', () => {
    expect(look(2_005_000, 1)).toBe(rawRow(2_000, 2_010)[0]);
  });

  it('5. 2,000~2,010천원 · 가족 4 (열 이동)', () => {
    expect(look(2_005_000, 4)).toBe(rawRow(2_000, 2_010)[3]);
  });

  it('6. 3,500~3,520천원 · 가족 1', () => {
    expect(look(3_510_000, 1)).toBe(rawRow(3_500, 3_520)[0]);
  });

  it('7. 3,500~3,520천원 · 가족 11 (마지막 열)', () => {
    expect(look(3_510_000, 11)).toBe(rawRow(3_500, 3_520)[10]);
  });

  it('8. 표 상한 직전 9,980~10,000천원 · 가족 1·2·3', () => {
    const row = rawRow(9_980, 10_000);
    expect(look(9_990_000, 1)).toBe(row[0]);
    expect(look(9_990_000, 2)).toBe(row[1]);
    expect(look(9_990_000, 3)).toBe(row[2]);
  });
});

/* ── B. 자녀 차감 원문 대조 (2건) ────────────────────────────── */

describe('골든 B — 8세 이상 20세 이하 자녀 차감 (비고 3 원문 대조)', () => {
  it('9. 원문 차감액이 12,500 / 29,160 / +25,000 이다', () => {
    expect(RAW).toContain('자녀가 1명인 경우 : 12,500원');
    expect(RAW).toContain('자녀가 2명인 경우 : 29,160원');
    expect(RAW).toContain('2명 초과 자녀 1명당 25,000원');
    expect(TABLE.childDeduction).toEqual({ one: 12_500, two: 29_160, extraPerChild: 25_000 });
  });

  it('10. 5,000~5,020천원 · 가족 3 · 자녀 2 → 원문 세액 − 29,160원', () => {
    const gross = rawRow(5_000, 5_020)[2] as number;
    expect(look(5_010_000, 3, 2)).toBe(gross - 29_160);
  });

  it('11. 차감이 세액보다 크면 0원 (비고 3 단서)', () => {
    const gross = rawRow(2_000, 2_010)[3] as number; // 3,220원
    expect(gross).toBeLessThan(29_160 + 25_000);
    expect(look(2_005_000, 4, 3)).toBe(0);
  });
});

/* ── C. 표 상한 초과 산식 원문 대조 (5건) ────────────────────── */

describe('골든 C — 표 상한 초과 산식 (비고 원문 대조)', () => {
  const cap = 10_000_000;

  it('12. 원문 초과 산식 문장이 그대로 들어 있다', () => {
    expect(RAW).toContain('10,000천원을 초과하는 금액에 98%를 곱한 금액의 35% 상당액');
    expect(RAW).toContain('(1,397,000원)');
    expect(RAW).toContain('(6,610,600원)');
    expect(RAW).toContain('(7,394,600원)');
    expect(RAW).toContain('(13,394,600원)');
    expect(RAW).toContain('(31,034,600원)');
  });

  it('13. 정확히 상한 10,000천원 → 원문의 "10,000천원인 경우의 해당 세액"', () => {
    const capRow = rawCapRow();
    expect(TABLE.overCap.baseTax).toEqual(capRow);
    expect(look(cap, 1)).toBe(capRow[0]);
    expect(look(cap, 5)).toBe(capRow[4]);
    // 표 마지막 구간(9,980~10,000)보다 크다 — 여기서 계단이 생긴다
    expect(capRow[0]).toBeGreaterThan(rawRow(9_980, 10_000)[0] as number);
  });

  it('14. 10,001천원 → 상한 세액 + 25,000원 + 초과분 × 98% × 35%', () => {
    const base = rawCapRow()[0] as number;
    const expected = base + 25_000 + 1_000 * 0.98 * 0.35;
    expect(look(10_001_000, 1)).toBeCloseTo(expected, 6);
  });

  it('15. 14,000천원(1구간 끝) 값이 2구간 상수 1,397,000원과 이어진다', () => {
    const base = rawCapRow()[0] as number;
    const atEnd = base + 25_000 + 4_000_000 * 0.98 * 0.35;
    expect(look(14_000_000, 1)).toBeCloseTo(atEnd, 6);
    // 원문 2구간 상수와 일치해야 연속이다
    expect(25_000 + 4_000_000 * 0.98 * 0.35).toBeCloseTo(1_397_000, 6);
    // 2구간 시작 직후
    expect(look(14_001_000, 1)).toBeCloseTo(base + 1_397_000 + 1_000 * 0.98 * 0.38, 6);
  });

  it('16. 30,000천원 초과부터는 98% 곱이 없다 (원문 그대로)', () => {
    const base = rawCapRow()[0] as number;
    // 3구간 끝(30,000천원): 98% 적용
    expect(look(30_000_000, 1)).toBeCloseTo(base + 6_610_600 + 2_000_000 * 0.98 * 0.4, 6);
    // 4구간(30,000천원 초과): 98% 없음
    expect(look(31_000_000, 1)).toBeCloseTo(base + 7_394_600 + 1_000_000 * 0.4, 6);
    // 연속성
    expect(6_610_600 + 2_000_000 * 0.98 * 0.4).toBeCloseTo(7_394_600, 6);
  });

  it('17. 최고 구간 87,000천원 초과 → +31,034,600원 + 초과분 45%', () => {
    const base = rawCapRow()[0] as number;
    expect(look(100_000_000, 1)).toBeCloseTo(base + 31_034_600 + 13_000_000 * 0.45, 6);
    // 87,000천원에서 5·6구간이 이어진다
    expect(13_394_600 + 42_000_000 * 0.42).toBeCloseTo(31_034_600, 6);
  });
});

/* ── D. 4대보험 고시 대조 (3건) ──────────────────────────────── */

const opts2026 = (over: Partial<CalcOptions> = {}): CalcOptions => ({
  dependents: 1,
  children: 0,
  nonTaxableMonthly: 200_000,
  taxRatio: 1,
  asOf: '2026-09-07',
  ...over,
});

describe('골든 D — 4대보험 (2026-07-01 고시 숫자로 직접 산술)', () => {
  it('18. 국민연금 기준소득월액 하한 410,000원이 걸린다', () => {
    // 과세 월급 300,000원 → 하한 미달
    const b = computeNet((300_000 + 200_000) * 12, opts2026());
    expect(b.taxableMonthly).toBe(300_000);
    expect(b.capped.nps).toBe('min');
    expect(b.nps).toBe(Math.floor(410_000 * 0.095 * 0.5)); // 19,475
    expect(b.nps).toBe(19_475);
  });

  it('19. 국민연금 상한 6,590,000원 · 건강보험 상한 9,183,480원이 걸린다', () => {
    const b = computeNet((200_000_000 + 200_000) * 12, opts2026());
    expect(b.capped.nps).toBe('max');
    expect(b.capped.nhis).toBe('max');
    expect(b.nps).toBe(Math.floor(6_590_000 * 0.095 * 0.5)); // 313,025
    expect(b.nps).toBe(313_025);
    // 보수월액보험료는 총액 고시 → 근로자는 절반
    expect(b.nhis).toBe(Math.floor((9_183_480 * 0.5) / 10) * 10); // 4,591,740
    expect(b.nhis).toBe(4_591_740);
    expect(b.ltc).toBe(Math.floor((4_591_740 * 0.1314) / 10) * 10); // 603,350
    expect(b.ltc).toBe(603_350);
  });

  it('20. 상·하한이 걸리지 않는 구간의 네 보험료 (절사 규칙 포함)', () => {
    const taxable = 3_213_333;
    const b = computeNet((taxable + 200_000) * 12, opts2026());
    expect(b.taxableMonthly).toBe(taxable);
    // 국민연금: 기준소득월액 천 원 절사 → 3,213,000
    expect(b.nps).toBe(Math.floor(3_213_000 * 0.095 * 0.5));
    // 건강보험: 총액 × 0.5 → 10원 절사
    expect(b.nhis).toBe(Math.floor((taxable * 0.0719 * 0.5) / 10) * 10);
    // 장기요양: 근로자 건보료 × 13.14% → 10원 절사
    expect(b.ltc).toBe(Math.floor((b.nhis * 0.1314) / 10) * 10);
    // 고용보험(실업급여): 근로자 0.9% → 10원 절사
    expect(b.ei).toBe(Math.floor((taxable * 0.009) / 10) * 10);
    expect(b.capped).toEqual({ nps: null, nhis: null });
  });
});

/* ── E. 실수령 통합 — 원문 세액 + 고시 산술로 조립해 대조 ────── */

describe('골든 E — 월 실수령 통합 (원문·고시에서 조립한 기대값)', () => {
  /** 세액표 원문과 고시 산술만으로 기대 실수령을 만든다. 구현 코드를 쓰지 않는다 */
  function expectedNet(annualGross: number, rawTaxOfTaxable: (taxable: number) => number) {
    const grossMonthly = Math.floor(annualGross / 12);
    const taxable = grossMonthly - 200_000;
    const npsBase = Math.min(Math.max(Math.floor(taxable / 1000) * 1000, 410_000), 6_590_000);
    const nps = Math.floor(npsBase * 0.095 * 0.5);
    const premium = Math.min(taxable * 0.0719, 9_183_480);
    const nhis = Math.floor((premium * 0.5) / 10) * 10;
    const ltc = Math.floor((nhis * 0.1314) / 10) * 10;
    const ei = Math.floor((taxable * 0.009) / 10) * 10;
    const incomeTax = Math.floor(rawTaxOfTaxable(taxable) / 10) * 10;
    const localTax = Math.floor((incomeTax * 0.1) / 10) * 10;
    const deductions = nps + nhis + ltc + ei + incomeTax + localTax;
    return { grossMonthly, taxable, nps, nhis, ltc, ei, incomeTax, localTax, deductions, net: grossMonthly - deductions };
  }

  it('21. 연봉 40,960,000원 · 가족 1 · 식대 20만 원', () => {
    const e = expectedNet(40_960_000, () => rawRow(3_200, 3_220)[0] as number);
    const b = computeNet(40_960_000, opts2026());
    expect(b.taxableMonthly).toBe(e.taxable);
    expect([b.nps, b.nhis, b.ltc, b.ei, b.incomeTax, b.localTax]).toEqual([
      e.nps, e.nhis, e.ltc, e.ei, e.incomeTax, e.localTax,
    ]);
    expect(b.deductions).toBe(e.deductions);
    expect(b.netMonthly).toBe(e.net);
  });

  it('22. 표 상한 계단 지점 — 연봉 122,400,000원과 122,400,012원의 낙폭 27,499원', () => {
    const capBase = rawCapRow()[0] as number;
    // 과세 월급이 정확히 상한이면 "10,000천원인 경우의 해당 세액"
    const at = expectedNet(122_400_000, () => capBase);
    // 1원만 넘으면 초과 산식(+25,000원)이 붙는다
    const over = expectedNet(122_400_012, (taxable) => capBase + 25_000 + (taxable - 10_000_000) * 0.98 * 0.35);

    expect(computeNet(122_400_000, opts2026()).netMonthly).toBe(at.net);
    expect(computeNet(122_400_012, opts2026()).netMonthly).toBe(over.net);
    expect(at.net - over.net).toBe(27_499);
  });
});

/* ── F. 2026-03-01 시행판 — 국가법령정보센터 원문 대조 (5건) ── */

describe('골든 F — 2026-03-01 시행판 (별표2 개정 2026-02-27)', () => {
  it('23. 원문 개정일과 시행일이 맞다', () => {
    expect(RAW26).toContain('소득세법 시행령 [별표 2] <개정 2026. 2. 27.>');
    expect(TABLE26.meta.amendedOn).toBe('2026-02-27');
    expect(TABLE26.meta.effectiveFrom).toBe('2026-03-01');
  });

  it('24. 자녀 차감액이 개정값 20,830 / 45,830 / +33,330원이다', () => {
    expect(RAW26).toContain('자녀가 1명인 경우 : 20,830원');
    expect(RAW26).toContain('자녀가 2명인 경우 : 45,830원');
    expect(RAW26).toContain('2명 초과 자녀 1명당 33,330원');
    expect(TABLE26.childDeduction).toEqual({ one: 20_830, two: 45_830, extraPerChild: 33_330 });
  });

  it('25. 본문 646구간 × 11열이 2024-02-29 시행판과 완전히 같다', () => {
    // 2026-02-27 개정은 비고 3(자녀 차감액)만 바꿨다. 본문 세액은 그대로다.
    expect(TABLE26.brackets).toHaveLength(TABLE.brackets.length);
    expect(TABLE26.brackets).toEqual(TABLE.brackets);
    expect(TABLE26.overCap.baseTax).toEqual(TABLE.overCap.baseTax);
    expect(TABLE26.overCap.segments).toEqual(TABLE.overCap.segments);
  });

  it('26. 2026 원문에서 직접 읽은 행이 번들 값과 같다 (파서 교차 확인)', () => {
    for (const [lo, hi] of [
      [1_060, 1_065],
      [3_500, 3_520],
      [5_000, 5_020],
      [9_980, 10_000],
    ] as const) {
      const raw = rawRow26(lo, hi);
      const bundled = TABLE26.brackets.find((b) => b.lo === lo * 1000 && b.hi === hi * 1000);
      expect(bundled?.tax, `${lo}~${hi}천원`).toEqual(raw);
      // HWPX 경로로 읽은 2024 판과도 같아야 한다
      expect(raw).toEqual(rawRow(lo, hi));
    }
  });

  it('27. 오늘 계산에는 2026-03-01 시행판이 쓰이고 자녀 차감이 커진 만큼 세액이 줄었다', () => {
    const withKid = computeNet(45_000_000, opts2026({ dependents: 2, children: 1 }));
    expect(withKid.taxTableEffectiveFrom).toBe('2026-03-01');
    expect(withKid.taxTableFallback).toBe(false);

    // 같은 입력을 2024 판(자녀 1명 12,500원)으로 계산하면 소득세가 더 크다
    const old = computeNet(45_000_000, opts2026({ dependents: 2, children: 1, asOf: '2025-12-31' }));
    expect(old.taxTableEffectiveFrom).toBe('2024-02-29');
    expect(withKid.incomeTax).toBeLessThan(old.incomeTax);
    // 차이는 차감액 인상분(20,830 − 12,500 = 8,330원)이다. 10원 절사 오차 한 칸 허용
    expect(old.incomeTax - withKid.incomeTax).toBeGreaterThanOrEqual(8_320);
    expect(old.incomeTax - withKid.incomeTax).toBeLessThanOrEqual(8_330);
  });
});

/* ── G. 국세청 홈택스 조회기 대조 (4건) ─────────────────────── */

describe('골든 G — 국세청 홈택스 간이세액표 조회 결과 대조', () => {
  /**
   * 2026-09-07 조회. 홈택스 > 세금신고 > 원천세 신고 > 근로소득 간이세액표
   * (2026-03-01 시행판). 입력의 "월 급여액"은 비과세·학자금을 제외한 금액이다.
   * 표·비고와 무관한 독립 출처라서 파서·열 매핑·초과 산식·절사를 한 번에 확인한다.
   */
  const HOMETAX: { salary: number; family: number; children: number; tax: number; local: number }[] = [
    { salary: 3_500_000, family: 1, children: 0, tax: 127_220, local: 12_720 },
    { salary: 3_500_000, family: 4, children: 2, tax: 3_510, local: 350 },
    // 표 상한(1,000만 원)을 넘는 구간 — 초과 산식(98% × 35% + 25,000원) 검증
    { salary: 12_000_000, family: 1, children: 0, tax: 2_218_400, local: 221_840 },
  ];
  const floor10 = (n: number) => Math.floor(n / 10) * 10;

  it.each(HOMETAX)(
    '28~30. 월급여 $salary · 가족 $family · 자녀 $children → 홈택스와 같은 세액',
    ({ salary, family, children, tax, local }) => {
      const mine = floor10(lookupIncomeTax(TABLE26, salary, family, children));
      expect(mine).toBe(tax);
      // 지방소득세 = 소득세 × 10%, 10원 미만 절사 (홈택스 결과로 확인된 규칙)
      expect(floor10(mine * 0.1)).toBe(local);
    },
  );

  it('31. 간이세액 선택 비율 80% · 120%도 10원 미만 절사다', () => {
    // 홈택스 조회(월급여 12,000,000 · 가족 1 · 자녀 0): 80% 1,774,720 / 120% 2,662,080
    const base = floor10(lookupIncomeTax(TABLE26, 12_000_000, 1, 0));
    expect(floor10(base * 0.8)).toBe(1_774_720);
    expect(floor10(base * 1.2)).toBe(2_662_080);
    // 엔진의 taxRatio 경로도 같은 값을 낸다
    const at80 = computeNet((12_000_000 + 200_000) * 12, opts2026({ taxRatio: 0.8 }));
    expect(at80.incomeTax).toBe(1_774_720);
  });
});
