/**
 * 데이터 게이트 — npm run check:data
 *
 *  1) 기준금리 신선도. 금통위는 약 6주 간격이라 90일이 지나면 한 번은 지나쳤다는 뜻이다.
 *     180일이 지나면 프로덕션 빌드를 막는다 — 판정에 현재 기준금리가 필요하다.
 *  2) 개발용 합성 데이터 플래그
 *  3) 별표 구간 연속성·요율 범위
 *  4) legal.json ↔ constants.ts 일치는 vitest(legal.test.ts)가 본다
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertBands } from './law-byl';
import type { BaseRateFile, BrokerageFile, LegalFile } from '../src/types';

const DATA = resolve(import.meta.dirname, '../src/data');
const read = <T>(name: string): T => JSON.parse(readFileSync(resolve(DATA, name), 'utf-8')) as T;

const WARN_DAYS = 90;
const BLOCK_DAYS = 180;

const problems: string[] = [];
const notes: string[] = [];

/* 1·2) 기준금리 */
const baserate = read<BaseRateFile>('baserate.json');
if (baserate.meta.dev === true) {
  problems.push('기준금리가 개발용 합성 데이터입니다. npm run data:fetch 로 실데이터를 받으세요.');
}
if (baserate.changes.length === 0) problems.push('기준금리 변동 시점이 비어 있습니다.');

const asOf = new Date(`${baserate.meta.asOf}T00:00:00`);
if (Number.isNaN(asOf.getTime())) {
  problems.push(`기준금리 asOf 형식이 잘못됐습니다: ${baserate.meta.asOf}`);
} else {
  const days = Math.floor((Date.now() - asOf.getTime()) / (24 * 60 * 60 * 1000));
  if (days >= BLOCK_DAYS) {
    problems.push(
      `기준금리 데이터가 ${days}일 지났습니다(asOf ${baserate.meta.asOf}).\n` +
        `  → npm run data:fetch 로 갱신하세요. 판정에는 현재 기준금리가 필요합니다.`,
    );
  } else if (days >= WARN_DAYS) {
    notes.push(`기준금리가 ${days}일 지났습니다(asOf ${baserate.meta.asOf}). 갱신을 권합니다.`);
  } else {
    notes.push(`기준금리 asOf ${baserate.meta.asOf} (${days}일 전), 변동 ${baserate.changes.length}건`);
  }
}

// 변동 시점 오름차순·중복 없음
for (let i = 1; i < baserate.changes.length; i++) {
  const prev = baserate.changes[i - 1];
  const cur = baserate.changes[i];
  if (prev === undefined || cur === undefined) continue;
  if (cur.from <= prev.from) problems.push(`기준금리 변동 시점 순서가 뒤집혔습니다: ${cur.from}`);
  if (cur.rate === prev.rate) problems.push(`기준금리 변동에 중복 값이 있습니다: ${cur.from}`);
}

/* 3) 중개보수 별표 */
const brokerage = read<BrokerageFile>('brokerage.json');
try {
  assertBands(brokerage.housing);
  notes.push(
    `중개보수 별표 개정 ${brokerage.meta.amendedOn}, 주택 ${brokerage.housing.length}구간, ` +
      `오피스텔 매매 ${(brokerage.officetel.sale * 100).toFixed(1)}%·임대차 ${(brokerage.officetel.lease * 100).toFixed(1)}%`,
  );
} catch (e) {
  problems.push(e instanceof Error ? e.message : String(e));
}

/* 4) legal.json 존재·항목 수 */
const legal = read<LegalFile>('legal.json');
if (legal.items.length !== 12) {
  problems.push(`legal.json 항목이 12개가 아닙니다 (${legal.items.length}개).`);
}
for (const item of legal.items) {
  if (!item.url.startsWith('https://www.law.go.kr/')) {
    problems.push(`legal.json ${item.key} 의 출처 URL이 국가법령정보센터가 아닙니다.`);
  }
}

for (const n of notes) console.log(`  ${n}`);
if (problems.length > 0) {
  console.error(`\ncheck:data 실패 — ${problems.length}건\n`);
  for (const p of problems) console.error(`• ${p}`);
  process.exit(1);
}
console.log('check:data 통과');
