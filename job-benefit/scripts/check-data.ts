/**
 * 데이터 게이트 — docs/FUNCTIONAL_SPEC.md §4
 * 낡은 상수·미확인 값이 배포되는 것을 막는다.  npm run check:data
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BenefitDaysFile, LegalFile, MinWageFile, QuitReasonsFile } from '../src/types';

const ROOT = resolve(import.meta.dirname, '..');
const read = <T>(p: string): T => JSON.parse(readFileSync(resolve(ROOT, p), 'utf-8')) as T;

const legal = read<LegalFile>('src/data/legal.json');
const wages = read<MinWageFile>('src/data/min-wage.json');
const days = read<BenefitDaysFile>('src/data/benefit-days.json');
const reasons = read<QuitReasonsFile>('src/data/quit-reasons.json');

const today = new Date().toISOString().slice(0, 10);
const year = Number(today.slice(0, 4));
const errors: string[] = [];
const warns: string[] = [];

/* 1) 올해 최저임금 행 — 하한이 여기서 나온다 */
const wageYears = wages.minWage.map((r) => r.year);
if (!wageYears.includes(year)) {
  errors.push(
    `min-wage.json 에 ${year}년 최저임금이 없습니다. 고용노동부 고시를 확인해 추가하세요 (있는 연도: ${wageYears.join(', ')}).`,
  );
}

/* 2) 별표 파일이 파이프라인 산출물인지 */
if (!days.meta.amendedOn || !days.meta.fetchedAt) errors.push('benefit-days.json 에 개정일·수집일이 없습니다. npm run data:fetch && npm run data:build 를 돌리세요.');
if (reasons.items.length !== 14) {
  errors.push(`quit-reasons.json 항목이 14개가 아닙니다(${reasons.items.length}개). 별표 2 는 번호 13까지지만 3의2 가 있어 14개입니다.`);
}

/* 3) 조문 상수의 무결성 — 값이 바뀌면 사고다 */
const must: Array<[string, unknown, unknown]> = [
  ['basePeriodMonths (18개월)', legal.basePeriodMonths, 18],
  ['insuredDaysMin (180일)', legal.insuredDaysMin, 180],
  ['waitingDays (7일)', legal.waitingDays, 7],
  ['rateNormal (100분의 60)', legal.rateNormal, 0.6],
  ['rateMin (100분의 80)', legal.rateMin, 0.8],
  ['baseDailyCap (11만3500원)', legal.baseDailyCap, 113_500],
  ['early.afterDays (14일)', legal.early.afterDays, 14],
  ['early.remainRatio (2분의 1)', legal.early.remainRatio, 0.5],
  ['early.employMonths (12개월)', legal.early.employMonths, 12],
  ['early.rate (2분의 1)', legal.early.rate, 0.5],
  ['stdHours.weekDiv (48시간)', legal.stdHours.weekDiv, 48],
  ['stdHours.monthDiv (209시간)', legal.stdHours.monthDiv, 209],
  ['stdHours.fourWeekDiv (28)', legal.stdHours.fourWeekDiv, 28],
  ['stdHours.dayHours (8시간)', legal.stdHours.dayHours, 8],
];
for (const [what, got, want] of must) {
  if (got !== want) errors.push(`legal.json ${what} 값이 ${String(want)} 가 아니라 ${String(got)} 입니다. docs/DATA_VERIFICATION.md 2장의 원문을 확인하세요.`);
}

/* 4) 별표 1 표의 성질 */
const bounds: Array<[string, number[]]> = [['under50', days.under50], ['from50', days.from50]];
for (const [name, row] of bounds) {
  if (row.length !== 5) errors.push(`benefit-days.json ${name} 이 5구간이 아닙니다`);
  for (let i = 1; i < row.length; i++) {
    if ((row[i] as number) < (row[i - 1] as number)) errors.push(`benefit-days.json ${name} 이 단조가 아닙니다: ${row.join(',')}`);
  }
}

/* 5) 출처 확인일 — 1년이면 경고, 2년이면 차단 */
const ageInDays = (iso: string): number => Math.floor((Date.parse(today) - Date.parse(iso)) / 86_400_000);
const sources = [
  ...legal.sources.map((s) => ({ ...s, where: 'legal.json' })),
  ...wages.minWage.map((r) => ({ ...r.source, where: `min-wage.json ${r.year}` })),
];
for (const s of sources) {
  const age = ageInDays(s.checkedAt);
  if (age >= 730) errors.push(`출처 확인일이 2년을 넘었습니다 (${s.where} · ${s.checkedAt}): ${s.label}`);
  else if (age >= 365) warns.push(`출처 확인일이 1년을 넘었습니다 (${s.where} · ${s.checkedAt}): ${s.label}`);
}

/* 6) 미확인 항목은 경고로 남기고 사람이 판단한다 */
for (const note of legal.needsVerification ?? []) warns.push(`legal.json 미확인: ${note}`);

for (const w of warns) console.warn(`  경고: ${w}`);
if (errors.length > 0) {
  console.error('\ncheck:data 실패');
  for (const e of errors) console.error(`  · ${e}`);
  console.error('\n근거는 docs/DATA_VERIFICATION.md 와 docs/FACT_CHECK.md 에 있습니다.');
  process.exit(1);
}
console.log(
  `check:data 통과 — 최저임금 ${year}년 행 있음, 별표 1 (${days.meta.amendedOn}), 별표 2 ${reasons.items.length}개 항목, ` +
    `조문 상수 ${must.length}건, 출처 ${sources.length}건${warns.length > 0 ? `, 경고 ${warns.length}건` : ''}`,
);
