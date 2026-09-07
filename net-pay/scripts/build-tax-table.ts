/**
 * 간이세액표 변환 — data-src/tax-table/* → src/data/tax-tables.json
 *   npm run data:build
 *
 * 파일명이 시행일이다(예: 2026-03-01.txt). 표·비고·초과 산식을 모두 원본에서 읽으므로
 * 사람이 숫자를 옮겨 적는 단계가 없다.
 *
 * 지원 형식
 *  - .txt  국가법령정보센터 별표 평문 (1순위, 최신판이 항상 있다)
 *  - .hwpx 공공데이터포털 국세청 파일
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseTaxTable } from './hwpx';
import { parseTaxTableText } from './law-byl';
import type { TaxTableFile } from '../src/types';

const SRC = resolve(import.meta.dirname, '../data-src/tax-table');
const OUT = resolve(import.meta.dirname, '../src/data/tax-tables.json');
const SOURCES = {
  txt: {
    url: 'https://www.law.go.kr/법령/소득세법시행령',
    license: '법령 본문 — 저작권법 제7조 제1호(보호받지 못하는 저작물)',
  },
  hwpx: {
    url: 'https://www.data.go.kr/data/15050747/fileData.do',
    license: '공공데이터포털 이용허락범위 제한 없음 (국세청)',
  },
} as const;
const COLS = 11;

function validate(t: TaxTableFile): void {
  const tag = `세액표 ${t.meta.effectiveFrom}`;
  t.brackets.forEach((b, i) => {
    if (b.tax.length !== COLS) throw new Error(`${tag}: ${b.lo}원 구간의 열이 ${b.tax.length}개`);
    if (b.hi <= b.lo) throw new Error(`${tag}: ${b.lo}원 구간이 뒤집혀 있습니다`);
    const prev = t.brackets[i - 1];
    if (prev && prev.hi !== b.lo) throw new Error(`${tag}: 구간이 끊깁니다 ${prev.hi} → ${b.lo}`);
    for (let c = 1; c < COLS; c++) {
      if ((b.tax[c] as number) > (b.tax[c - 1] as number))
        throw new Error(`${tag}: ${b.lo}원에서 가족 수가 늘었는데 세액이 증가합니다`);
    }
    if (prev) {
      for (let c = 0; c < COLS; c++) {
        if ((b.tax[c] as number) < (prev.tax[c] as number))
          throw new Error(`${tag}: ${b.lo}원 ${c + 1}열 세액이 이전 구간보다 작습니다`);
      }
    }
  });
  const cap = t.brackets[t.brackets.length - 1]!.hi;
  if (t.overCap.segments[0]!.from !== cap)
    throw new Error(`${tag}: 초과 구간 시작(${t.overCap.segments[0]!.from})이 표 상한(${cap})과 다릅니다`);
  if (t.overCap.baseTax.length !== COLS) throw new Error(`${tag}: 상한 기준 세액이 ${t.overCap.baseTax.length}개`);
  // 상한 기준 세액은 마지막 구간 세액보다 크거나 같아야 한다
  t.overCap.baseTax.forEach((v, c) => {
    if (v < (t.brackets[t.brackets.length - 1]!.tax[c] as number))
      throw new Error(`${tag}: 상한 기준 세액 ${c + 1}열이 마지막 구간보다 작습니다`);
  });
}

if (!existsSync(SRC)) {
  console.error(`원본 폴더가 없습니다: ${SRC}\n먼저 npm run data:fetch 를 실행하세요.`);
  process.exit(1);
}
const files = readdirSync(SRC)
  .filter((f) => f.endsWith('.txt') || f.endsWith('.hwpx'))
  .sort();
if (files.length === 0) {
  console.error(`원본이 없습니다: ${SRC}\n먼저 npm run data:fetch 를 실행하세요.`);
  process.exit(1);
}

const tables = files.map((name) => {
  const isTxt = name.endsWith('.txt');
  const effectiveFrom = name.replace(/\.(txt|hwpx)$/, '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom))
    throw new Error(`파일명이 시행일(YYYY-MM-DD.txt|hwpx) 형식이 아닙니다: ${name}`);
  const path = resolve(SRC, name);
  const meta = {
    effectiveFrom,
    fetchedAt: statSync(path).mtime.toISOString().slice(0, 10),
    ...(isTxt ? SOURCES.txt : SOURCES.hwpx),
  };
  const t = isTxt
    ? parseTaxTableText(readFileSync(path, 'utf-8'), meta)
    : parseTaxTable(readFileSync(path), meta);
  validate(t);
  return t;
});
tables.sort((a, b) => a.meta.effectiveFrom.localeCompare(b.meta.effectiveFrom));

writeFileSync(OUT, `${JSON.stringify(tables, null, 2)}\n`);
for (const t of tables) {
  console.log(
    `  ${t.meta.effectiveFrom} 시행 (개정 ${t.meta.amendedOn ?? '?'}) — ` +
      `${t.brackets.length}구간, 상한 ${t.brackets[t.brackets.length - 1]!.hi.toLocaleString('ko-KR')}원, ` +
      `자녀차감 ${t.childDeduction.one.toLocaleString('ko-KR')}/${t.childDeduction.two.toLocaleString('ko-KR')}, ` +
      `초과구간 ${t.overCap.segments.length}개`,
  );
}
console.log(`src/data/tax-tables.json — 시행판 ${tables.length}개`);
