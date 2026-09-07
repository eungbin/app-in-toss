/**
 * ECOS 실데이터 수집 — 연 1회 수동 실행.
 *   ECOS_API_KEY=... npm run data:fetch
 * 한국은행 작성 통계만 수집한다(731Y003, 722Y001).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Candle, SeriesFile } from '../src/types';
import { CUTOFF_MONTHS } from '../src/constants';
import { cutoffDate, fetchSeries, isoDate, toMap } from './ecos';
import { loadEnv } from './env';

const OUT = resolve(import.meta.dirname, '../src/data/series');

interface SeriesSpec {
  id: 'usdkrw' | 'cnykrw';
  name: string;
  stat: string;
  from: string;
  items: { o: string; h: string; l: string; c: string };
}

const SPECS: SeriesSpec[] = [
  {
    id: 'usdkrw',
    name: '원/달러 환율',
    stat: '731Y003',
    from: '19900101',
    items: { o: '0000002', h: '0000005', l: '0000004', c: '0000003' },
  },
  {
    id: 'cnykrw',
    name: '원/위안 환율',
    stat: '731Y003',
    from: '20141201',
    items: { o: '0000007', h: '0000008', l: '0000009', c: '0000010' },
  },
];

async function buildSeries(key: string, spec: SeriesSpec, cutoff: string): Promise<SeriesFile> {
  const [o, h, l, c] = await Promise.all([
    fetchSeries(key, spec.stat, 'D', spec.from, cutoff, spec.items.o).then(toMap),
    fetchSeries(key, spec.stat, 'D', spec.from, cutoff, spec.items.h).then(toMap),
    fetchSeries(key, spec.stat, 'D', spec.from, cutoff, spec.items.l).then(toMap),
    fetchSeries(key, spec.stat, 'D', spec.from, cutoff, spec.items.c).then(toMap),
  ]);

  const candles: Candle[] = [];
  for (const d of [...c.keys()].sort()) {
    if (d > cutoff) continue;
    const close = c.get(d)!;
    const open = o.get(d);
    const high = h.get(d);
    const low = l.get(d);
    const partial = open === undefined || high === undefined || low === undefined;
    candles.push(
      partial
        ? { d, o: close, h: close, l: close, c: close, f: true }
        : { d, o: open, h: high, l: low, c: close },
    );
  }

  return {
    id: spec.id,
    name: spec.name,
    source: {
      stat: spec.stat,
      items: [spec.items.o, spec.items.h, spec.items.l, spec.items.c],
      org: '한국은행',
      fetchedAt: isoDate(),
      cutoff,
    },
    unit: '원',
    candles,
  };
}

async function buildBaseRate(key: string, cutoff: string) {
  const rows = await fetchSeries(key, '722Y001', 'D', '19990101', cutoff, '0101000');
  const points = [...toMap(rows).entries()]
    .filter(([d]) => d <= cutoff)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, v]) => ({ d, v }));
  return {
    source: {
      stat: '722Y001',
      items: ['0101000'],
      org: '한국은행' as const,
      fetchedAt: isoDate(),
      cutoff,
    },
    points,
  };
}

async function main() {
  loadEnv();
  const key = process.env.ECOS_API_KEY;
  if (!key) {
    console.error('ECOS_API_KEY 가 없습니다. .env.example 을 참고해 인증키를 설정하세요.');
    console.error('개발용 합성 데이터는 `npm run data:dev` 로 만들 수 있습니다.');
    process.exit(1);
  }
  const cutoff = cutoffDate(CUTOFF_MONTHS);
  console.log(`컷오프: ${cutoff} (오늘 기준 ${CUTOFF_MONTHS}개월 이전)`);
  mkdirSync(OUT, { recursive: true });

  for (const spec of SPECS) {
    const file = await buildSeries(key, spec, cutoff);
    writeFileSync(resolve(OUT, `${spec.id}.json`), JSON.stringify(file));
    const first = file.candles[0]?.d;
    const last = file.candles[file.candles.length - 1]?.d;
    console.log(`${spec.id}: ${file.candles.length}행 (${first} ~ ${last})`);
  }

  const base = await buildBaseRate(key, cutoff);
  writeFileSync(resolve(OUT, 'baserate.json'), JSON.stringify(base));
  console.log(`baserate: ${base.points.length}행`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
