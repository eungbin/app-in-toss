/**
 * 원본 데이터 받기 — npm run data:fetch
 *
 *  1) 기준금리: ECOS 722Y001 일별 → 변동 시점만 추출 → src/data/baserate.json
 *  2) 중개보수: 국가법령정보센터 공인중개사법 시행규칙 별표 1·2 평문 → data-src/brokerage/
 *
 * 별표는 평문을 보존만 하고 JSON 변환은 `npm run data:build`가 한다(원본 보존 원칙).
 * 기준금리는 변동 시점 추출이 곧 파싱이라 여기서 바로 JSON을 쓴다.
 *
 * 컷오프는 두지 않는다 — fx-replay의 12개월 컷오프는 투자 자문 조항 방어용이고,
 * 이 앱은 판정에 **현재** 기준금리가 필요하다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from './env';
import { dashDate, fetchSeries, isoDate } from './ecos';
import { parseAmendedOn } from './law-byl';
import type { BaseRateChange, BaseRateFile } from '../src/types';

const SRC_DIR = resolve(import.meta.dirname, '../data-src/brokerage');
const DATA_DIR = resolve(import.meta.dirname, '../src/data');

const LAW = 'https://www.law.go.kr';
/** 한글 경로는 헤더(Referer)에 넣을 수 없어 퍼센트 인코딩해 둔다 */
const LAW_PAGE = encodeURI(`${LAW}/법령/공인중개사법시행규칙`);
const UA = 'Mozilla/5.0 (compatible; rent-calc data-fetch)';

const ECOS_STAT = '722Y001';
/** 한국은행 기준금리 항목 */
const ECOS_ITEM = '0101000';
const ECOS_FROM = '19990101';

async function get(url: string, referer?: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...(referer ? { Referer: referer } : {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

/** 일별 시계열에서 값이 바뀐 날만 남긴다 */
export function toChanges(rows: { TIME: string; DATA_VALUE: string }[]): BaseRateChange[] {
  const sorted = [...rows].sort((a, b) => a.TIME.localeCompare(b.TIME));
  const changes: BaseRateChange[] = [];
  let prev: number | null = null;
  for (const r of sorted) {
    const pct = Number(r.DATA_VALUE);
    if (!Number.isFinite(pct)) continue;
    const rate = Math.round(pct * 10_000) / 1_000_000; // 3.00(%) → 0.03
    if (prev !== null && rate === prev) continue;
    changes.push({ from: dashDate(r.TIME), rate });
    prev = rate;
  }
  return changes;
}

async function fetchBaseRate(): Promise<void> {
  const key = process.env.ECOS_API_KEY;
  if (key === undefined || key === '') {
    throw new Error('ECOS_API_KEY 가 없습니다. .env.example 을 보고 .env 에 넣으세요.');
  }
  const to = isoDate().replace(/-/g, '');
  const rows = await fetchSeries(key, ECOS_STAT, 'D', ECOS_FROM, to, ECOS_ITEM);
  if (rows.length === 0) throw new Error('ECOS 722Y001 응답이 비었습니다');

  const changes = toChanges(rows);
  const lastRow = rows[rows.length - 1];
  if (lastRow === undefined) throw new Error('ECOS 응답 마지막 행이 없습니다');

  const file: BaseRateFile = {
    meta: {
      source: '한국은행 ECOS 722Y001 한국은행 기준금리',
      fetchedAt: isoDate(),
      asOf: dashDate(
        [...rows].sort((a, b) => a.TIME.localeCompare(b.TIME))[rows.length - 1]?.TIME ??
          lastRow.TIME,
      ),
      license: '출처 표시(한국은행 작성 통계)',
      attribution: `출처 : ECOS(한국은행, 한국은행 기준금리), ${isoDate()}`,
    },
    changes,
  };
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(resolve(DATA_DIR, 'baserate.json'), `${JSON.stringify(file, null, 2)}\n`);
  const last = changes[changes.length - 1];
  console.log(
    `src/data/baserate.json — 변동 ${changes.length}건, 최신 ${last?.from} ${((last?.rate ?? 0) * 100).toFixed(2)}%, asOf ${file.meta.asOf}`,
  );
}

/** 별표 하나를 평문으로 받아 data-src 에 보존 */
async function fetchByl(bylNo: string, label: string, lsiSeq: string): Promise<string> {
  const linkUrl = `${LAW}/LSW/lsBylInfoPLinkR.do?lsiSeq=${lsiSeq}&bylNo=${bylNo}&bylBrNo=00&bylCls=BE&bylEfYd=&bylEfYdYn=Y`;
  const link = await get(linkUrl, LAW_PAGE);
  const bylSeq = /id="bylSeq"[^>]*value="(\d+)"/.exec(link)?.[1];
  if (bylSeq === undefined) throw new Error(`별표 일련번호(bylSeq)를 찾지 못했습니다: ${label}`);

  const res = await fetch(`${LAW}/LSW/lsBylTextDownLoad.do`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Referer: linkUrl,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: new URLSearchParams({ bylSeq, title: label, mode: '0' }),
  });
  if (!res.ok) throw new Error(`${res.status} lsBylTextDownLoad.do (${label})`);
  const text = await res.text();
  if (!text.includes('공인중개사법')) throw new Error(`받은 문서가 별표가 아닙니다: ${label}`);

  mkdirSync(SRC_DIR, { recursive: true });
  const amendedOn = parseAmendedOn(text) ?? 'unknown';
  const path = resolve(SRC_DIR, `table${bylNo === '0001' ? '1' : '2'}-${amendedOn}.txt`);
  writeFileSync(path, text);
  console.log(
    `data-src/brokerage/${path.split('/').pop()} — ${(text.length / 1024).toFixed(1)}KB (별표 ${bylSeq}, 개정 ${amendedOn})`,
  );
  return bylSeq;
}

async function main(): Promise<void> {
  loadEnv();

  const page = await get(LAW_PAGE);
  const lsiSeq = /lsInfoP\.do\?lsiSeq=(\d+)/.exec(page)?.[1];
  if (lsiSeq === undefined) throw new Error('법령 일련번호(lsiSeq)를 찾지 못했습니다');
  console.log(`공인중개사법 시행규칙 lsiSeq=${lsiSeq}`);

  const t1 = await fetchByl('0001', '주택 중개보수 상한요율', lsiSeq);
  const t2 = await fetchByl('0002', '오피스텔 중개보수 요율', lsiSeq);
  writeFileSync(
    resolve(SRC_DIR, 'meta.json'),
    `${JSON.stringify({ lsiSeq, bylSeq: { table1: t1, table2: t2 }, fetchedAt: isoDate(), url: LAW_PAGE }, null, 2)}\n`,
  );

  await fetchBaseRate();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
