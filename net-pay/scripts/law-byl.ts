/**
 * 국가법령정보센터 별표 텍스트 파서.
 *
 * 국가법령정보센터는 별표를 `lsBylTextDownLoad.do`로 **평문 텍스트**로 내려준다.
 * 표는 박스 문자(│)로 칸을 나눈다. 공공데이터포털의 HWPX보다 최신판을 얻기 쉽고
 * 파싱도 단순해서 이 경로를 1순위로 쓴다.
 *
 * 법령 자체는 저작권 보호 대상이 아니다(저작권법 제7조 제1호).
 */
import type { OverCapSegment, TaxBracket, TaxTableFile } from '../src/types';

const COLS = 11;
/** 표의 월급여액은 천원 단위로 적혀 있다 */
const UNIT = 1000;
const SEP = '│';

const toInt = (s: string): number => Number(s.replace(/,/g, ''));
const cellsOf = (line: string): string[] =>
  line.trim().replace(/^│|│$/g, '').split(SEP).map((c) => c.trim());

/** "<개정 2026. 2. 27.>" */
export function parseAmendedOn(text: string): string | null {
  const m = /개정\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./.exec(text);
  if (!m) return null;
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}

function parseBrackets(lines: string[]): TaxBracket[] {
  const rows: TaxBracket[] = [];
  for (const line of lines) {
    if (!line.includes(SEP)) continue;
    const cells = cellsOf(line);
    if (cells.length < COLS + 2) continue;
    const vals = cells.slice(0, COLS + 2).map((c) => {
      if (c === '-') return 0;
      const n = c.replace(/,/g, '');
      return /^\d+$/.test(n) ? Number(n) : NaN;
    });
    if (vals.some((v) => Number.isNaN(v))) continue;
    const [lo, hi] = [vals[0] as number, vals[1] as number];
    if (!(hi > lo)) continue;
    rows.push({ lo: lo * UNIT, hi: hi * UNIT, tax: vals.slice(2, COLS + 2) as number[] });
  }
  if (rows.length === 0) throw new Error('별표 텍스트에서 표 구간을 읽지 못했습니다');
  return rows;
}

/** 비고 3 — 8세 이상 20세 이하 자녀 수별 차감액 */
function parseChildDeduction(text: string): TaxTableFile['childDeduction'] {
  const one = /자녀가 1명인 경우\s*:?\s*([\d,]+)원/.exec(text);
  const two = /자녀가 2명인 경우\s*:?\s*([\d,]+)원/.exec(text);
  const three = /자녀가 3명 이상인 경우\s*:?\s*([\d,]+)원\s*\+\s*2명 초과 자녀 1명당\s*([\d,]+)원/.exec(text);
  if (!one || !two || !three) throw new Error('비고 3(자녀 차감액)을 읽지 못했습니다');
  return { one: toInt(one[1] as string), two: toInt(two[1] as string), extraPerChild: toInt(three[2] as string) };
}

/** 표 상한 행 "│10,000천원 │<11개 값>" */
function parseBaseTax(lines: string[], capThousand: number): number[] {
  const label = `${capThousand.toLocaleString('en-US')}천원`;
  for (const line of lines) {
    if (!line.includes(SEP)) continue;
    const cells = cellsOf(line);
    if (cells[0] !== label || cells.length < COLS + 1) continue;
    const vals = cells.slice(1, COLS + 1).map(toInt);
    if (vals.length === COLS && vals.every((v) => Number.isFinite(v))) return vals;
  }
  throw new Error(`상한(${label}) 기준 세액 행을 읽지 못했습니다`);
}

/**
 * 초과 구간. 원문은 이렇게 생겼다.
 *   │10,000천원 초과 │(10,000천원인 경우의 해당 세액) + (…98%를 곱한 금액의 35% 상당액) + (25,000원)│
 *   │14,000천원 이하 │                                                                             │
 * 상한(이하)이 다음 줄 첫 칸에 이어진다. 마지막 구간은 상한이 없다.
 */
function parseOverCap(lines: string[], baseTax: number[]): TaxTableFile['overCap'] {
  const segments: OverCapSegment[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (!line.includes(SEP)) continue;
    const cells = cellsOf(line);
    const head = /^([\d,]+)천원\s*초과$/.exec(cells[0] ?? '');
    if (!head || cells.length < 2) continue;

    const from = toInt(head[1] as string) * UNIT;
    const body = cells[1] as string;
    const rateM = /금액의\s*([\d.]+)%\s*상당액/.exec(body);
    if (!rateM) continue;

    // 다음 줄 첫 칸의 "N천원 이하"가 이 구간의 상한
    let to: number | null = null;
    const next = lines[i + 1];
    if (next && next.includes(SEP)) {
      const tail = /^([\d,]+)천원\s*이하$/.exec(cellsOf(next)[0] ?? '');
      if (tail) to = toInt(tail[1] as string) * UNIT;
    }

    segments.push({
      from,
      to,
      // 괄호로 감싼 단독 원 금액이 구간 상수다
      add: [...body.matchAll(/\(([\d,]+)원\)/g)].reduce((s, m) => s + toInt(m[1] as string), 0),
      factor: /98%를?\s*곱한/.test(body) ? 0.98 : 1,
      rate: Number(rateM[1]) / 100,
    });
  }
  if (segments.length === 0) throw new Error('초과 구간 산식을 읽지 못했습니다');
  const last = segments[segments.length - 1] as OverCapSegment;
  if (last.to !== null) throw new Error('마지막 초과 구간에 상한이 붙어 있습니다');
  return { verified: true, baseTax, segments };
}

/** 별표 텍스트 한 개 → 세액표 하나. 시행일은 문서에 없으므로 파일명으로 받는다 */
export function parseTaxTableText(
  text: string,
  meta: { effectiveFrom: string; fetchedAt: string; url: string; license: string },
): TaxTableFile {
  const lines = text.split('\n');
  const brackets = parseBrackets(lines);
  const cap = (brackets[brackets.length - 1] as TaxBracket).hi;
  const baseTax = parseBaseTax(lines, cap / UNIT);
  const amendedOn = parseAmendedOn(text);
  return {
    meta: {
      source: '국가법령정보센터 소득세법 시행령 별표2 (근로소득 간이세액표)',
      ...meta,
      ...(amendedOn ? { amendedOn } : {}),
    },
    brackets,
    childDeduction: parseChildDeduction(text),
    overCap: parseOverCap(lines, baseTax),
  };
}
