/**
 * 데이터 게이트 — docs/FUNCTIONAL_SPEC.md §4
 * 프로덕션 빌드 전에 돌려서 낡은 상수·미확인 값이 배포되는 것을 막는다.
 *   npm run check:data
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LegalFile, RatesFile, TaxTableFile } from '../src/types';

const ROOT = resolve(import.meta.dirname, '..');
const read = <T>(p: string): T => JSON.parse(readFileSync(resolve(ROOT, p), 'utf-8')) as T;

const legal = read<LegalFile>('src/data/legal.json');
const rates = read<RatesFile>('src/data/rates.json');
const tables = read<TaxTableFile[]>('src/data/tax-tables.json');

const today = new Date().toISOString().slice(0, 10);
const year = Number(today.slice(0, 4));

const errors: string[] = [];
const warns: string[] = [];

/* 1. 올해 최저임금 행이 있어야 한다 */
const wageYears = legal.minWage.map((r) => r.year);
if (!wageYears.includes(year)) {
  errors.push(
    `legal.json 에 ${year}년 최저임금이 없습니다. 최저임금위원회 고시를 확인해 minWage 에 추가하세요 (있는 연도: ${wageYears.join(', ')}).`,
  );
}

/* 2. 손으로 만든 세액표 차단 */
for (const t of tables) {
  if (t.meta.dev) errors.push(`손으로 만든 세액표(${t.meta.effectiveFrom})가 들어 있습니다. net-pay 에서 만든 파일을 복사하세요.`);
}

/* 3. 세액표 시행일이 미래이면 안 된다 */
const newest = tables[tables.length - 1];
if (!newest) errors.push('세액표가 비어 있습니다. net-pay/src/data/tax-tables.json 을 복사하세요.');
else if (newest.meta.effectiveFrom > today) {
  warns.push(`가장 새 세액표의 시행일(${newest.meta.effectiveFrom})이 아직 오지 않았습니다.`);
}
if (newest && !newest.overCap.verified) {
  errors.push('세액표의 표 상한 초과 산식이 원문에서 확인되지 않았습니다(overCap.verified=false).');
}

/* 4. 요율에 현재 연도 행이 있어야 한다 */
const rateYears = new Set(rates.map((r) => Number(r.from.slice(0, 4))));
if (!rateYears.has(year)) {
  errors.push(`rates.json 에 ${year}년 요율 행이 없습니다. net-pay 에서 갱신한 파일을 복사하세요.`);
}

/* 5. 출처 확인일 — 1년이면 경고, 2년이면 차단 */
const ageInDays = (iso: string): number =>
  Math.floor((Date.parse(today) - Date.parse(iso)) / 86_400_000);

/**
 * 이 앱은 언제나 `rateFor(오늘)` 만 쓴다 — 과거 연도 행은 net-pay 의 시간축 기능용이고
 * 여기서는 읽지 않는다. 그래서 확인일·미확인 검사는 **지금 적용되는 행**만 본다.
 * 안 쓰는 행의 경고로 목록이 덮이면 정작 봐야 할 경고를 못 본다.
 */
const activeRate = [...rates].reverse().find((r) => r.from <= today) ?? rates[rates.length - 1];

const allSources = [
  ...legal.sources.map((s) => ({ ...s, where: 'legal.json sources' })),
  ...legal.minWage.map((r) => ({ ...r.source, where: `legal.json minWage ${r.year}` })),
  ...(activeRate?.sources ?? []).map((s) => ({ ...s, where: `rates.json ${activeRate?.from}` })),
];
for (const s of allSources) {
  const age = ageInDays(s.checkedAt);
  if (age >= 730) errors.push(`출처 확인일이 2년을 넘었습니다 (${s.where} · ${s.checkedAt}): ${s.label}`);
  else if (age >= 365) warns.push(`출처 확인일이 1년을 넘었습니다 (${s.where} · ${s.checkedAt}): ${s.label}`);
}

/* 6. 미확인 항목은 경고로 남기고 사람이 판단한다 */
for (const note of legal.needsVerification ?? []) warns.push(`legal.json 미확인: ${note}`);
for (const note of activeRate?.needsVerification ?? []) {
  warns.push(`rates.json ${activeRate?.from} 미확인: ${note}`);
}

/* 7. 상수 자체의 무결성 — 조문 값에서 벗어나면 사고다 */
const must: [string, unknown, unknown][] = [
  ['night.startMin (22:00)', legal.night.startMin, 1320],
  ['night.endMin (06:00)', legal.night.endMin, 360],
  ['dailyStdMinutes (8시간)', legal.dailyStdMinutes, 480],
  ['rates.overtime (100분의 50)', legal.rates.overtime, 0.5],
  ['rates.night (100분의 50)', legal.rates.night, 0.5],
  ['rates.holidayIn8 (100분의 50)', legal.rates.holidayIn8, 0.5],
  ['rates.holidayOver8 (100분의 100)', legal.rates.holidayOver8, 1],
  ['weeklyHoliday.minHours (15시간)', legal.weeklyHoliday.minHours, 15],
  ['weeklyHoliday.capMinutes (8시간)', legal.weeklyHoliday.capMinutes, 480],
  ['weeklyHoliday.stdWeekMinutes (40시간)', legal.weeklyHoliday.stdWeekMinutes, 2400],
  ['dailyLabor.deduct (1일 15만원)', legal.dailyLabor.deduct, 150_000],
  ['dailyLabor.taxRate (100분의 6)', legal.dailyLabor.taxRate, 0.06],
  ['dailyLabor.creditRate (100분의 55)', legal.dailyLabor.creditRate, 0.55],
  ['business.taxRate (100분의 3)', legal.business.taxRate, 0.03],
  ['smallTaxFloor (1천원)', legal.smallTaxFloor, 1000],
];
for (const [what, got, want] of must) {
  if (got !== want) errors.push(`legal.json ${what} 값이 ${String(want)} 가 아니라 ${String(got)} 입니다. docs/FACT_CHECK.md 1장의 원문을 확인하세요.`);
}

/* 보고 */
for (const w of warns) console.warn(`  경고: ${w}`);
if (errors.length > 0) {
  console.error('\ncheck:data 실패');
  for (const e of errors) console.error(`  · ${e}`);
  console.error('\n근거는 docs/FACT_CHECK.md 에 있습니다.');
  process.exit(1);
}
console.log(`check:data 통과 — 최저임금 ${year}년 행 있음, 요율·세액표 최신, 출처 ${allSources.length}건${warns.length > 0 ? `, 경고 ${warns.length}건` : ''}`);
