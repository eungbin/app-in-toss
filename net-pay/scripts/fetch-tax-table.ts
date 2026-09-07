/**
 * 간이세액표 원본 받기 — 국가법령정보센터 소득세법 시행령 별표2.
 *   npm run data:fetch
 *
 * 법령 본문은 저작권 보호 대상이 아니다(저작권법 제7조 제1호).
 * 같은 표가 공공데이터포털에도 "이용허락범위 제한 없음"으로 올라오지만 개정 반영이 늦다.
 * 그래서 항상 최신 시행판이 있는 법령정보센터를 1순위로 쓴다.
 *
 * 흐름: 법령 페이지에서 lsiSeq → 별표 링크에서 bylSeq → 평문 텍스트 내려받기.
 * 시행일은 문서에 없으므로(개정일과 다름) 아래 표로 옮긴다. 모르는 개정일은 사람이 확인해야 한다.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAmendedOn } from './law-byl';

const OUT_DIR = resolve(import.meta.dirname, '../data-src/tax-table');
const BASE = 'https://www.law.go.kr';
const LAW_PAGE = `${BASE}/법령/소득세법시행령`;
/** 소득세법 시행령 별표2 */
const BYL_NO = '0002';
const UA = 'Mozilla/5.0 (compatible; net-pay data-fetch)';

/** 개정일 → 시행일 (국세청 안내 기준) */
const EFFECTIVE_FROM: Record<string, string> = {
  '2024-02-29': '2024-02-29',
  '2026-02-27': '2026-03-01',
};

async function get(url: string, referer?: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...(referer ? { Referer: referer } : {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function main(): Promise<void> {
  // 1) 현행 법령 일련번호
  const page = await get(LAW_PAGE);
  const lsiSeq = /lsInfoP\.do\?lsiSeq=(\d+)/.exec(page)?.[1];
  if (!lsiSeq) throw new Error('법령 일련번호(lsiSeq)를 찾지 못했습니다');

  // 2) 별표2 일련번호
  const linkUrl = `${BASE}/LSW/lsBylInfoPLinkR.do?lsiSeq=${lsiSeq}&bylNo=${BYL_NO}&bylBrNo=00&bylCls=BE&bylEfYd=&bylEfYdYn=Y`;
  const link = await get(linkUrl, LAW_PAGE);
  const bylSeq = /id="bylSeq"[^>]*value="(\d+)"/.exec(link)?.[1];
  const title = /<title>[^>]*?&gt;\s*([^|]+?)\s*\|/.exec(link)?.[1]?.trim() ?? '근로소득 간이세액표';
  if (!bylSeq) throw new Error('별표 일련번호(bylSeq)를 찾지 못했습니다');

  // 3) 평문 텍스트
  const body = new URLSearchParams({ bylSeq, title, mode: '0' });
  const res = await fetch(`${BASE}/LSW/lsBylTextDownLoad.do`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Referer: linkUrl,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body,
  });
  if (!res.ok) throw new Error(`${res.status} lsBylTextDownLoad.do`);
  const text = await res.text();
  if (text.length < 50_000) throw new Error(`받은 텍스트가 너무 짧습니다 (${text.length}자)`);
  if (!text.includes('근로소득 간이세액표')) throw new Error('받은 문서가 간이세액표가 아닙니다');

  const amendedOn = parseAmendedOn(text);
  if (!amendedOn) throw new Error('원문에서 개정일을 읽지 못했습니다');
  const effectiveFrom = EFFECTIVE_FROM[amendedOn];
  if (!effectiveFrom) {
    throw new Error(
      `개정 ${amendedOn} 의 시행일을 모릅니다. 국세청 안내로 확인해 scripts/fetch-tax-table.ts 의 EFFECTIVE_FROM 에 추가하세요.`,
    );
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const out = resolve(OUT_DIR, `${effectiveFrom}.txt`);
  const existed = existsSync(out);
  writeFileSync(out, text);
  console.log(
    `data-src/tax-table/${effectiveFrom}.txt — ${(text.length / 1024).toFixed(0)}KB (개정 ${amendedOn}, 법령 ${lsiSeq}/별표 ${bylSeq})${existed ? ' · 덮어씀' : ''}`,
  );
  console.log('다음: npm run data:build');
}

await main();
