/**
 * ECOS Open API 클라이언트 — docs/FUNCTIONAL_SPEC.md §4
 * 라이선스: 한국은행 작성 통계만 사용한다. docs/DATA_VERIFICATION.md 참조.
 */
export interface EcosRow {
  TIME: string;
  DATA_VALUE: string;
  ITEM_CODE1?: string;
}

const BASE = 'https://ecos.bok.or.kr/api/StatisticSearch';
const PAGE = 1000;

export async function fetchSeries(
  key: string,
  stat: string,
  cycle: 'D' | 'M',
  from: string,
  to: string,
  item: string,
): Promise<EcosRow[]> {
  const out: EcosRow[] = [];
  let start = 1;
  for (;;) {
    const url = `${BASE}/${key}/json/kr/${start}/${start + PAGE - 1}/${stat}/${cycle}/${from}/${to}/${item}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ECOS HTTP ${res.status} (${stat}/${item})`);
    const json = (await res.json()) as {
      RESULT?: { CODE: string; MESSAGE: string };
      StatisticSearch?: { list_total_count: number; row: EcosRow[] };
    };
    if (json.RESULT) {
      // INFO-200 = 더 이상 데이터 없음
      if (json.RESULT.CODE === 'INFO-200') break;
      throw new Error(`ECOS ${json.RESULT.CODE}: ${json.RESULT.MESSAGE} (${stat}/${item})`);
    }
    const rows = json.StatisticSearch?.row ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
    start += PAGE;
  }
  return out;
}

/** YYYYMMDD → number 맵 */
export function toMap(rows: EcosRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = Number(r.DATA_VALUE);
    if (Number.isFinite(v)) m.set(r.TIME, v);
  }
  return m;
}

/** 빌드 시점 기준 컷오프 (YYYYMMDD) — docs/PRD.md 확정: 12개월 */
export function cutoffDate(months: number, now: Date = new Date()): string {
  const d = new Date(now.getTime());
  d.setMonth(d.getMonth() - months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export const isoDate = (now: Date = new Date()): string => now.toISOString().slice(0, 10);
