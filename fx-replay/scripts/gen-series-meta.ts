/**
 * 시계열 메타데이터 생성 — 화면 대부분은 캔들이 아니라 이름·출처·기간만 쓴다.
 * 메타는 정적으로 두고 캔들은 지연 로딩해 초기 번들을 줄인다.
 *   npx tsx scripts/gen-series-meta.ts
 * fetch-ecos.ts 도 수집 후 같은 파일을 쓴다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SeriesFile } from '../src/types';

const DIR = resolve(import.meta.dirname, '../src/data');

export interface SeriesMeta {
  id: SeriesFile['id'];
  name: string;
  unit: SeriesFile['unit'];
  source: SeriesFile['source'];
  firstDate: string;
  lastDate: string;
  count: number;
}

export function buildMeta(): {
  series: SeriesMeta[];
  baseRate: { source: SeriesFile['source']; firstDate: string; lastDate: string; count: number };
} {
  const series = (['usdkrw', 'cnykrw'] as const).map((id) => {
    const f = JSON.parse(readFileSync(resolve(DIR, `series/${id}.json`), 'utf-8')) as SeriesFile;
    const first = f.candles[0];
    const last = f.candles[f.candles.length - 1];
    return {
      id: f.id,
      name: f.name,
      unit: f.unit,
      source: f.source,
      firstDate: first?.d ?? '',
      lastDate: last?.d ?? '',
      count: f.candles.length,
    };
  });

  const br = JSON.parse(readFileSync(resolve(DIR, 'series/baserate.json'), 'utf-8')) as {
    source: SeriesFile['source'];
    points: Array<{ d: string; v: number }>;
  };

  return {
    series,
    baseRate: {
      source: br.source,
      firstDate: br.points[0]?.d ?? '',
      lastDate: br.points[br.points.length - 1]?.d ?? '',
      count: br.points.length,
    },
  };
}

export function writeMeta(): void {
  const meta = buildMeta();
  writeFileSync(resolve(DIR, 'series-meta.json'), JSON.stringify(meta, null, 2));
  console.log(
    `series-meta.json — ${meta.series.map((s) => `${s.id} ${s.count}행`).join(', ')}, baserate ${meta.baseRate.count}행`,
  );
}

if (process.argv[1]?.endsWith('gen-series-meta.ts')) writeMeta();
