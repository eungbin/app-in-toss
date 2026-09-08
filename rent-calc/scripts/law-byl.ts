/**
 * 국가법령정보센터 별표 텍스트 파서 — 공인중개사법 시행규칙 별표 1·2.
 *
 * 별표는 `lsBylTextDownLoad.do`로 **평문 텍스트**를 받을 수 있다(조문 본문은 JS 앱이라 불가).
 * 표는 박스 문자로 칸을 나눈다. 별표 1은 ┌─┬─┐ 계열, 별표 2는 ┏━┯━┓ 계열을 쓴다.
 *
 * 법령 자체는 저작권 보호 대상이 아니다(저작권법 제7조 제1호).
 *
 * net-pay/scripts/law-byl.ts 와 같은 경로를 쓰지만 표 모양이 달라(4칸, 세로 병합)
 * 파서는 따로 둔다.
 */
import type { BrokerageBand, BrokerageKind } from '../src/types';

const SEP = /[│┃]/;
const 만 = 10_000;
const 억 = 100_000_000;

/** "<신설 2021. 10. 19.>" / "<개정 2021. 10. 19.>" */
export function parseAmendedOn(text: string): string | null {
  const m = /(?:개정|신설)\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./.exec(text);
  if (!m) return null;
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}

const cellsOf = (line: string): string[] =>
  line
    .trim()
    .replace(/^[│┃]|[│┃]$/g, '')
    .split(SEP)
    .map((c) => c.trim());

/** "5천만원", "2억원", "1억원", "15억원" → 원 */
export function parseAmount(s: string): number | null {
  const m = /^(?:(\d+)억)?\s*(?:(\d+)천)?\s*만?원$/.exec(s.replace(/\s/g, ''));
  if (!m) return null;
  const 억부 = m[1] === undefined ? 0 : Number(m[1]) * 억;
  const 천부 = m[2] === undefined ? 0 : Number(m[2]) * 1000 * 만;
  if (m[1] === undefined && m[2] === undefined) return null;
  return 억부 + 천부;
}

/** "1천분의 6" → 0.006 */
export function parseRatio(s: string): number | null {
  const m = /1천분의\s*(\d+)/.exec(s);
  return m === null ? null : Number(m[1]) / 1000;
}

/** "25만원" → 250000, "" → null */
export function parseCap(s: string): number | null {
  const m = /^(\d+)만원$/.exec(s.replace(/\s/g, ''));
  return m === null ? null : Number(m[1]) * 만;
}

/**
 * 거래금액 칸 한 줄 → [lo, hi].
 *   "5천만원 미만"            → [0, 5천만]
 *   "5천만원 이상 2억원 미만" → [5천만, 2억]
 *   "15억원 이상"             → [15억, null]
 */
export function parseBand(s: string): { lo: number; hi: number | null } | null {
  const t = s.replace(/\s+/g, ' ').trim();

  const both = /^(.+?)\s*이상\s*(.+?)\s*미만$/.exec(t);
  if (both) {
    const lo = parseAmount(both[1] as string);
    const hi = parseAmount(both[2] as string);
    if (lo === null || hi === null) return null;
    return { lo, hi };
  }
  const under = /^(.+?)\s*미만$/.exec(t);
  if (under) {
    const hi = parseAmount(under[1] as string);
    return hi === null ? null : { lo: 0, hi };
  }
  const over = /^(.+?)\s*이상$/.exec(t);
  if (over) {
    const lo = parseAmount(over[1] as string);
    return lo === null ? null : { lo, hi: null };
  }
  return null;
}

/**
 * 별표 1 — 주택 중개보수 상한요율.
 *
 * 거래내용 칸은 세로로 병합돼 있어 첫 줄에만 "매매ㆍ교환" / "2. 임대차 등"이 적힌다.
 * 그래서 거래내용이 보이면 그때부터 kind를 바꿔 가며 읽는다.
 */
export function parseTable1(text: string): BrokerageBand[] {
  const bands: BrokerageBand[] = [];
  let kind: BrokerageKind | null = null;

  for (const line of text.split('\n')) {
    if (!SEP.test(line)) continue;
    const cells = cellsOf(line);
    if (cells.length < 4) continue;

    const [head, amount, ratioCell, capCell] = cells as [string, string, string, string];
    if (/매매|교환/.test(head)) kind = 'sale';
    else if (/임대차/.test(head)) kind = 'lease';
    if (kind === null) continue;

    const band = parseBand(amount);
    const ratio = parseRatio(ratioCell);
    if (band === null || ratio === null) continue;

    bands.push({ kind, lo: band.lo, hi: band.hi, ratio, cap: parseCap(capCell) });
  }

  if (bands.length === 0) throw new Error('별표 1에서 요율 구간을 읽지 못했습니다');
  return bands;
}

/** 별표 2 — 오피스텔. "1. 매매ㆍ교환 │1천분의 5" 두 줄 */
export function parseTable2(text: string): Record<BrokerageKind, number> {
  let sale: number | null = null;
  let lease: number | null = null;

  for (const line of text.split('\n')) {
    if (!SEP.test(line)) continue;
    const cells = cellsOf(line);
    if (cells.length < 2) continue;
    const [head, ratioCell] = cells as [string, string];
    const ratio = parseRatio(ratioCell);
    if (ratio === null) continue;
    if (/매매|교환/.test(head)) sale = ratio;
    else if (/임대차/.test(head)) lease = ratio;
  }

  if (sale === null || lease === null) throw new Error('별표 2에서 요율을 읽지 못했습니다');
  return { sale, lease };
}

/** 구간 연속성·요율 범위 검사. 파서가 한 줄 놓치면 여기서 걸린다 */
export function assertBands(bands: BrokerageBand[]): void {
  for (const kind of ['sale', 'lease'] as const) {
    const rows = bands.filter((b) => b.kind === kind);
    if (rows.length !== 6) {
      throw new Error(`별표 1 ${kind} 구간이 6개가 아닙니다 (${rows.length}개)`);
    }
    if (rows[0]?.lo !== 0) throw new Error(`별표 1 ${kind} 첫 구간이 0원에서 시작하지 않습니다`);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as BrokerageBand;
      if (row.ratio <= 0 || row.ratio > 0.01) {
        throw new Error(`별표 1 ${kind} 요율이 범위를 벗어났습니다: ${row.ratio}`);
      }
      const next = rows[i + 1];
      if (next === undefined) {
        if (row.hi !== null) throw new Error(`별표 1 ${kind} 마지막 구간에 상한이 있습니다`);
      } else if (row.hi !== next.lo) {
        throw new Error(`별표 1 ${kind} 구간이 이어지지 않습니다: ${row.hi} → ${next.lo}`);
      }
    }
  }
}
