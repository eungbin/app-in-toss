/**
 * 데이터 게이트 — docs/FUNCTIONAL_SPEC.md §4 (DT-5)
 * 프로덕션 빌드 전에 돌려서 추정치·합성 데이터가 배포되는 것을 막는다.
 *   npm run check:data
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RatesFile, TaxTableFile } from '../src/types';

const ROOT = resolve(import.meta.dirname, '..');
const read = <T>(p: string): T => JSON.parse(readFileSync(resolve(ROOT, p), 'utf-8')) as T;

const rates = read<RatesFile>('src/data/rates.json');
const tables = read<TaxTableFile[]>('src/data/tax-tables.json');
const today = new Date().toISOString().slice(0, 10);
const year = Number(today.slice(0, 4));

const errors: string[] = [];
const warns: string[] = [];

/* 1. 합성 세액표 차단 */
for (const t of tables) {
  if (t.meta.dev) errors.push(`개발용 합성 세액표(${t.meta.effectiveFrom})가 들어 있습니다. npm run data:build 로 실제 표를 넣으세요.`);
}

/* 2. 세액표 시행일·무결성 */
const applicable = tables.filter((t) => t.meta.effectiveFrom <= today);
if (applicable.length === 0) errors.push(`오늘(${today}) 적용할 세액표가 없습니다.`);
const current = applicable[applicable.length - 1];
if (current && !current.overCap.verified)
  errors.push(`세액표 ${current.meta.effectiveFrom}의 1,000만 원 초과 산식이 원문 대조 전입니다(overCap.verified=false).`);

for (const t of tables) {
  const bs = t.brackets;
  if (bs.length === 0) {
    errors.push(`세액표 ${t.meta.effectiveFrom}에 구간이 없습니다.`);
    continue;
  }
  bs.forEach((b, i) => {
    const label = `세액표 ${t.meta.effectiveFrom} ${b.lo}원`;
    if (b.tax.length !== 11) errors.push(`${label}: 열이 ${b.tax.length}개입니다(11개여야 함).`);
    const prev = bs[i - 1];
    if (prev && prev.hi !== b.lo) errors.push(`${label}: 구간이 끊깁니다(${prev.hi} → ${b.lo}).`);
    if (prev) {
      for (let c = 0; c < b.tax.length; c++) {
        if ((b.tax[c] as number) < (prev.tax[c] as number)) {
          errors.push(`${label}: ${c + 1}열 세액이 이전 구간보다 작습니다.`);
          break;
        }
      }
    }
  });
}

/* 3. 요율 — 오름차순, 오늘 적용 행의 검증 상태 */
for (let i = 1; i < rates.length; i++) {
  const prev = rates[i - 1];
  const cur = rates[i];
  if (prev && cur && prev.from >= cur.from) errors.push(`rates.json 이 from 오름차순이 아닙니다(${prev.from} → ${cur.from}).`);
}
const applicableRates = rates.filter((r) => r.from <= today);
const currentRate = applicableRates[applicableRates.length - 1];
if (!currentRate) errors.push(`오늘(${today}) 적용할 요율 행이 없습니다.`);
else if (currentRate.needsVerification?.length)
  errors.push(`오늘 적용 요율(${currentRate.from})에 미확인 항목이 있습니다: ${currentRate.needsVerification.join(', ')}`);

if (!rates.some((r) => r.from.startsWith(String(year))))
  errors.push(`rates.json 에 ${year}년 행이 없습니다. 매년 1월·7월 갱신이 필요합니다.`);

/* 4. 과거 행 미확인은 경고 — 시간축 각주로 처리한다 */
for (const r of rates) {
  if (r !== currentRate && r.needsVerification?.length)
    warns.push(`요율 ${r.from}: ${r.needsVerification.join(', ')}`);
}

for (const w of warns) console.warn(`  경고 ${w}`);
if (errors.length > 0) {
  console.error(`\n데이터 검사 실패: ${errors.length}건\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\ndocs/FUNCTIONAL_SPEC.md 4장(빌드·데이터 파이프라인)을 확인하세요.');
  process.exit(1);
}
console.log(`데이터 검사 통과 — 세액표 ${tables.length}개, 요율 ${rates.length}행${warns.length ? `, 경고 ${warns.length}건` : ''}`);
