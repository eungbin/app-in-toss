/**
 * 실제 간이세액표 변환 — 국세청에서 받은 표를 앱 번들 JSON으로 만든다.
 *   npm run data:build
 *
 * 준비 (수동, 연 1회):
 *  1. 홈택스 > 세금신고 > 원천세 신고 > 근로소득 간이세액표에서 조견표(엑셀)를 받는다.
 *  2. 엑셀을 CSV로 저장해 data-src/tax-table/<시행일>.csv 로 둔다.
 *     열 순서: 이상, 미만, 1명, 2명, … 11명 (단위는 원 또는 천원, 아래 UNIT로 지정)
 *  3. 표 앞의 "비고"에서 자녀 차감액과 1,000만 원 초과 산식을 읽어
 *     data-src/tax-table/<시행일>.meta.json 에 적는다.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TaxBracket, TaxTableFile } from '../src/types';

const SRC = resolve(import.meta.dirname, '../data-src/tax-table');
const OUT = resolve(import.meta.dirname, '../src/data/tax-tables.json');
const COLS = 11;

interface MetaFile {
  effectiveFrom: string;
  fetchedAt: string;
  url: string;
  license: string;
  /** CSV 금액 단위 배수. 천원 단위 표면 1000 */
  unit: number;
  childDeduction: { one: number; two: number; extraPerChild: number };
  overCap: TaxTableFile['overCap'];
}

function parseCsv(text: string, unit: number): TaxBracket[] {
  const rows: TaxBracket[] = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, '').replace(/,/g, ''));
    const nums = cells.map((c) => Number(c.replace(/[^0-9.-]/g, '')));
    // 숫자 13개(이상·미만·11열)가 모두 유효한 줄만 데이터로 본다
    if (nums.length < COLS + 2) continue;
    if (nums.slice(0, COLS + 2).some((n) => !Number.isFinite(n))) continue;
    const lo = (nums[0] as number) * unit;
    const hi = (nums[1] as number) * unit;
    if (!(hi > lo)) continue;
    rows.push({ lo, hi, tax: nums.slice(2, COLS + 2).map((n) => n as number) });
  }
  return rows.sort((a, b) => a.lo - b.lo);
}

function validate(brackets: TaxBracket[], label: string): void {
  if (brackets.length === 0) throw new Error(`${label}: 구간이 하나도 파싱되지 않았습니다`);
  brackets.forEach((b, i) => {
    if (b.tax.length !== COLS) throw new Error(`${label}: ${b.lo}원 구간의 열이 ${b.tax.length}개 (11개여야 함)`);
    const prev = brackets[i - 1];
    if (prev && prev.hi !== b.lo) throw new Error(`${label}: 구간이 끊깁니다 ${prev.hi} → ${b.lo}`);
    for (let c = 1; c < COLS; c++) {
      if ((b.tax[c] as number) > (b.tax[c - 1] as number))
        throw new Error(`${label}: ${b.lo}원 구간에서 가족 수가 늘었는데 세액이 증가합니다`);
    }
    if (prev) {
      for (let c = 0; c < COLS; c++) {
        if ((b.tax[c] as number) < (prev.tax[c] as number))
          throw new Error(`${label}: ${b.lo}원 구간 ${c + 1}열 세액이 이전 구간보다 작습니다`);
      }
    }
  });
}

const metas = existsSync(SRC) ? readdirSync(SRC).filter((f) => f.endsWith('.meta.json')) : [];
if (metas.length === 0) {
  console.error(`간이세액표 원본이 없습니다: ${SRC}/<시행일>.csv + .meta.json`);
  console.error('이 스크립트 상단 주석의 준비 절차를 따르세요. 개발 중에는 npm run data:dev 를 쓰면 됩니다.');
  process.exit(1);
}

const tables: TaxTableFile[] = metas
  .map((name) => {
    const meta = JSON.parse(readFileSync(resolve(SRC, name), 'utf-8')) as MetaFile;
    const csvPath = resolve(SRC, name.replace('.meta.json', '.csv'));
    const brackets = parseCsv(readFileSync(csvPath, 'utf-8'), meta.unit);
    validate(brackets, meta.effectiveFrom);
    return {
      meta: {
        source: '국세청 근로소득 간이세액표(소득세법 시행령 별표2)',
        effectiveFrom: meta.effectiveFrom,
        fetchedAt: meta.fetchedAt,
        url: meta.url,
        license: meta.license,
      },
      brackets,
      childDeduction: meta.childDeduction,
      overCap: meta.overCap,
    } satisfies TaxTableFile;
  })
  .sort((a, b) => a.meta.effectiveFrom.localeCompare(b.meta.effectiveFrom));

writeFileSync(OUT, `${JSON.stringify(tables, null, 2)}\n`);
console.log(`src/data/tax-tables.json — ${tables.length}개 시행판: ${tables.map((t) => t.meta.effectiveFrom).join(', ')}`);
