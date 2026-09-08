/**
 * ECOS Open API — 기준금리(722Y001)만 쓴다.
 * 한국은행 작성 통계라 출처 표시로 상업 이용이 가능하다(루트 memory / fx-replay DATA_VERIFICATION).
 */
export interface EcosRow {
  TIME: string;
  DATA_VALUE: string;
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
      StatisticSearch?: { row: EcosRow[] };
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

export const isoDate = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

/** "20260827" → "2026-08-27" */
export const dashDate = (yyyymmdd: string): string =>
  `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
