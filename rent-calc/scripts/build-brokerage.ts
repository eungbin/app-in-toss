/**
 * 별표 평문 → src/data/brokerage.json — npm run data:build
 * 원본은 data-src/brokerage/ 에 그대로 남긴다.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertBands, parseAmendedOn, parseTable1, parseTable2 } from './law-byl';
import { isoDate } from './ecos';
import type { BrokerageFile } from '../src/types';

const SRC_DIR = resolve(import.meta.dirname, '../data-src/brokerage');
const OUT = resolve(import.meta.dirname, '../src/data/brokerage.json');

/** table1-2021-10-19.txt 중 개정일이 가장 늦은 것 */
function latest(prefix: string): { path: string; amendedOn: string } {
  const files = readdirSync(SRC_DIR).filter((f) => f.startsWith(prefix) && f.endsWith('.txt'));
  if (files.length === 0) {
    throw new Error(`${prefix}*.txt 가 없습니다. 먼저 npm run data:fetch 를 실행하세요.`);
  }
  const sorted = files.sort();
  const path = resolve(SRC_DIR, sorted[sorted.length - 1] as string);
  const amendedOn = parseAmendedOn(readFileSync(path, 'utf-8')) ?? 'unknown';
  return { path, amendedOn };
}

function main(): void {
  const t1 = latest('table1-');
  const t2 = latest('table2-');

  const housing = parseTable1(readFileSync(t1.path, 'utf-8'));
  assertBands(housing);
  const officetel = parseTable2(readFileSync(t2.path, 'utf-8'));

  const metaPath = resolve(SRC_DIR, 'meta.json');
  const fetched = existsSync(metaPath)
    ? (JSON.parse(readFileSync(metaPath, 'utf-8')) as {
        lsiSeq: string;
        bylSeq: { table1: string; table2: string };
        fetchedAt: string;
        url: string;
      })
    : { lsiSeq: 'unknown', bylSeq: { table1: 'unknown', table2: 'unknown' }, fetchedAt: isoDate(), url: '' };

  const file: BrokerageFile = {
    meta: {
      source: '공인중개사법 시행규칙 별표 1(주택)·별표 2(주거용 오피스텔)',
      lsiSeq: fetched.lsiSeq,
      bylSeq: fetched.bylSeq,
      amendedOn: t1.amendedOn,
      fetchedAt: fetched.fetchedAt,
      url: fetched.url,
      license: '법령은 저작권 보호 대상이 아님(저작권법 제7조 제1호)',
    },
    housing,
    officetel,
  };

  writeFileSync(OUT, `${JSON.stringify(file, null, 2)}\n`);
  console.log(
    `src/data/brokerage.json — 주택 ${housing.length}구간, 오피스텔 매매 ${(officetel.sale * 100).toFixed(1)}%·임대차 ${(officetel.lease * 100).toFixed(1)}% (개정 ${t1.amendedOn})`,
  );
}

main();
