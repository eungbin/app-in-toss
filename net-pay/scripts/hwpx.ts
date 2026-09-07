/**
 * 국세청 근로소득 간이세액표(HWPX) 파서.
 *
 * 원본은 소득세법 시행령 별표2를 그대로 담은 한글 문서다. 표와 비고를 모두 읽어
 * 앱 번들 JSON을 만든다. 사람이 숫자를 옮겨 적는 단계가 없으므로 전사 오류가 없다.
 */
import { readZipEntry } from './zip';
import type { OverCapSegment, TaxBracket, TaxTableFile } from '../src/types';

const COLS = 11;
/** 표의 월급여액은 천원 단위로 적혀 있다 */
const UNIT = 1000;

/** HWPX 본문의 텍스트 조각을 문서 순서대로 이어 붙인다 */
export function extractText(hwpx: Buffer): string {
  const xml = readZipEntry(hwpx, 'Contents/section0.xml').toString('utf-8');
  const parts = [...xml.matchAll(/<hp:t>([\s\S]*?)<\/hp:t>/g)].map((m) =>
    (m[1] ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&'),
  );
  return parts.join(' ').replace(/\s+/g, ' ');
}

const toInt = (s: string): number => Number(s.replace(/,/g, ''));

/** 월급여액별·공제대상가족수별 표 (마지막 구간의 hi = 표 상한) */
function parseBrackets(text: string): TaxBracket[] {
  const head = text.indexOf('이상 미만');
  if (head < 0) throw new Error('표 머리글("이상 미만")을 찾지 못했습니다');
  const toks = text.slice(head + '이상 미만'.length).split(' ').filter(Boolean);

  const rows: TaxBracket[] = [];
  let i = 0;
  while (i + COLS + 1 < toks.length) {
    const chunk = toks.slice(i, i + COLS + 2);
    const vals = chunk.map((t) => (t === '-' ? 0 : /^-?[\d,]+$/.test(t) ? toInt(t) : NaN));
    if (vals.some((v) => Number.isNaN(v))) break; // 표가 끝나고 비고·초과 산식이 시작된 지점
    const [lo, hi] = [vals[0] as number, vals[1] as number];
    if (!(hi > lo)) break;
    rows.push({ lo: lo * UNIT, hi: hi * UNIT, tax: vals.slice(2, COLS + 2) as number[] });
    i += COLS + 2;
  }
  if (rows.length === 0) throw new Error('표에서 구간을 읽지 못했습니다');
  return rows;
}

/** 비고 3 — 8세 이상 20세 이하 자녀 수별 차감액 */
function parseChildDeduction(text: string): TaxTableFile['childDeduction'] {
  const one = /자녀가 1명인 경우\s*:?\s*([\d,]+)원/.exec(text);
  const two = /자녀가 2명인 경우\s*:?\s*([\d,]+)원/.exec(text);
  const three = /자녀가 3명 이상인 경우\s*:?\s*([\d,]+)원\s*\+\s*2명 초과 자녀 1명당\s*([\d,]+)원/.exec(text);
  if (!one || !two || !three) throw new Error('비고 3(자녀 차감액)을 읽지 못했습니다');
  return {
    one: toInt(one[1] as string),
    two: toInt(two[1] as string),
    extraPerChild: toInt(three[2] as string),
  };
}

/**
 * 표 상한 초과 구간.
 * 원문 형식: "10,000천원 초과 14,000천원 이하 (10,000천원인 경우의 해당 세액) + (…)"
 * 각 구간은 누적이 아니라 **그 구간만으로 완결**된다.
 */
function parseOverCap(text: string, capThousand: number): TaxTableFile['overCap'] {
  const label = `${capThousand.toLocaleString('en-US')}천원`;
  // 상한 구간의 기준 세액 11개: "<상한>천원 <11개 숫자>" 뒤에 "<상한>천원 초과"가 이어진다.
  // 뒤쪽 표식은 lookahead 로 남겨 두어야 초과 구간 파싱의 첫 표식이 살아 있다.
  const baseRe = new RegExp(`${label}\\s+((?:[\\d,]+\\s+){${COLS}})(?=${label}\\s*초과)`);
  const baseM = baseRe.exec(text);
  if (!baseM) throw new Error(`상한(${label}) 기준 세액 행을 읽지 못했습니다`);
  const baseTax = (baseM[1] as string).trim().split(/\s+/).map(toInt);
  if (baseTax.length !== COLS) throw new Error(`상한 기준 세액이 ${baseTax.length}개입니다`);

  const tail = text.slice(baseM.index + baseM[0].length);
  const marks = [...tail.matchAll(/([\d,]+)천원\s*초과(?:\s*([\d,]+)천원\s*이하)?/g)];
  const segments: OverCapSegment[] = [];

  marks.forEach((m, idx) => {
    const from = toInt(m[1] as string) * UNIT;
    const to = m[2] ? toInt(m[2] as string) * UNIT : null;
    const start = (m.index ?? 0) + m[0].length;
    const end = idx + 1 < marks.length ? (marks[idx + 1]!.index ?? tail.length) : tail.length;
    const body = tail.slice(start, end);

    const rateM = /금액의\s*([\d.]+)%\s*상당액/.exec(body);
    if (!rateM) throw new Error(`${m[0]} 구간의 세율을 읽지 못했습니다`);
    const factor = /98%를?\s*곱한/.test(body) ? 0.98 : 1;
    // 괄호로 감싼 단독 원 금액이 구간 상수다
    const add = [...body.matchAll(/\(([\d,]+)원\)/g)].reduce((sum, a) => sum + toInt(a[1] as string), 0);
    segments.push({ from, to, add, factor, rate: Number(rateM[1]) / 100 });
  });

  if (segments.length === 0) throw new Error('초과 구간 산식을 읽지 못했습니다');
  if (segments[segments.length - 1]!.to !== null) throw new Error('마지막 초과 구간에 상한이 붙어 있습니다');
  return { verified: true, baseTax, segments };
}

/** 원문 개정일 "<개정 2024. 2. 29.>" */
export function parseAmendedOn(text: string): string | null {
  const m = /개정\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./.exec(text);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * HWPX 한 개 → 세액표 하나.
 * 시행일은 문서에 없다(개정일과 다름). 파일명으로 받는다.
 */
export function parseTaxTable(
  hwpx: Buffer,
  meta: { effectiveFrom: string; fetchedAt: string; url: string; license: string },
): TaxTableFile {
  const text = extractText(hwpx);
  const brackets = parseBrackets(text);
  const cap = brackets[brackets.length - 1]!.hi;
  return {
    meta: {
      source: '국세청 근로소득 간이세액표(소득세법 시행령 별표2)',
      ...meta,
      ...(parseAmendedOn(text) ? { amendedOn: parseAmendedOn(text) as string } : {}),
    },
    brackets,
    childDeduction: parseChildDeduction(text),
    overCap: parseOverCap(text, cap / UNIT),
  };
}
