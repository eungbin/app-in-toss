/**
 * 개발용 간이세액표 생성 — 실제 표(국세청)를 받기 전에 앱을 돌려보기 위한 합성 데이터.
 *   npm run data:dev
 * 생성물에는 meta.dev = true 가 박히고, check:data 가 프로덕션 빌드를 차단한다.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { devMonthlyTax } from './dev-tax-formula';

const OUT = resolve(import.meta.dirname, '../src/data/tax-tables.json');

const LO = 1_060_000;
const HI = 10_000_000;
const STEP = 10_000;
const COLS = 11;

const floor10 = (n: number) => Math.floor(n / 10) * 10;

const brackets = [];
for (let lo = LO; lo < HI; lo += STEP) {
  const tax: number[] = [];
  for (let d = 1; d <= COLS; d++) tax.push(floor10(devMonthlyTax(lo, d)));
  brackets.push({ lo, hi: lo + STEP, tax });
}

/** 표 상한을 넘는 구간 — 실제 표는 별표2 비고의 산식을 쓴다. 여기서는 근사식을 구간 선형화한다 */
const FACTOR = 0.98;
const BOUNDS: Array<[number, number | null]> = [
  [10_000_000, 14_000_000],
  [14_000_000, 28_000_000],
  [28_000_000, 30_000_000],
  [30_000_000, 45_000_000],
  [45_000_000, 87_000_000],
  [87_000_000, null],
];
const SAMPLE_TOP = 200_000_000;
const segments = BOUNDS.map(([from, to], i) => {
  const upper = to ?? SAMPLE_TOP;
  const rate = (devMonthlyTax(upper, 1) - devMonthlyTax(from, 1)) / ((upper - from) * FACTOR);
  // 첫 구간에만 마지막 표 구간과의 단차를 보정한다
  const add = i === 0 ? Math.round(devMonthlyTax(HI, 1) - devMonthlyTax(HI - STEP, 1)) : 0;
  return { from, to, add, factor: FACTOR, rate: Number(rate.toFixed(6)) };
});

const table = {
  meta: {
    source: '개발용 합성 표 (국세청 근로소득 간이세액표 아님)',
    effectiveFrom: '2026-03-01',
    fetchedAt: new Date().toISOString().slice(0, 10),
    url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6583&cntntsId=7862',
    license: '해당 없음 — 합성 데이터',
    dev: true as const,
  },
  brackets,
  // 2026-03-01 시행판 개정값 (비즈폼·국세청 안내 확인, 2026-09-07)
  childDeduction: { one: 20_830, two: 45_830, extraPerChild: 33_330 },
  overCap: { verified: false, segments },
};

writeFileSync(OUT, `${JSON.stringify([table], null, 2)}\n`);
console.log(`src/data/tax-tables.json — 개발용 합성 표 ${brackets.length}구간 (프로덕션 빌드 차단됨)`);
