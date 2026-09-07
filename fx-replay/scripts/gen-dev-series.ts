/**
 * 개발용 합성 시계열 생성 — ECOS 인증키 없이 앱을 돌리기 위한 임시 데이터.
 *   npm run data:dev
 * source.dev = true 로 표시되며, 프로덕션 빌드에서는 검사에 걸려 실패한다.
 * 실제 값이 아니므로 화면·해설 검증에만 쓴다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Candle, SeriesFile } from '../src/types';
import { CUTOFF_MONTHS } from '../src/constants';
import { cutoffDate, isoDate } from './ecos';

const OUT = resolve(import.meta.dirname, '../src/data/series');

/** 결정적 난수 (mulberry32) — 실행마다 같은 데이터 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gauss = (r: () => number) =>
  Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());

const fmt = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

/** 주말을 제외한 거래일 목록 */
function tradingDays(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(Number(from.slice(0, 4)), Number(from.slice(4, 6)) - 1, Number(from.slice(6, 8)));
  const end = new Date(Number(to.slice(0, 4)), Number(to.slice(4, 6)) - 1, Number(to.slice(6, 8)));
  while (d <= end) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) out.push(fmt(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** 구간별 목표 수준 — 실제 역사와 대략 비슷한 형태를 만들어 화면 검증에 쓴다 */
const ANCHORS: Array<[string, number]> = [
  ['19900101', 707],
  ['19970101', 845],
  ['19971201', 1200],
  ['19971231', 1695],
  ['19980101', 1700],
  ['19981231', 1204],
  ['20050101', 1010],
  ['20051231', 1013],
  ['20080101', 936],
  ['20081201', 1400],
  ['20090301', 1570],
  ['20091231', 1165],
  ['20200101', 1158],
  ['20200320', 1280],
  ['20201231', 1088],
  ['20220601', 1240],
  ['20221025', 1440],
  ['20221230', 1265],
  ['20250101', 1470],
  ['20261231', 1400],
];

function anchorLevel(d: string): number {
  let prev = ANCHORS[0]!;
  for (const a of ANCHORS) {
    if (a[0] >= d) {
      const span = Number(a[0]) - Number(prev[0]);
      if (span <= 0) return a[1];
      const t = (Number(d) - Number(prev[0])) / span;
      return prev[1] + (a[1] - prev[1]) * t;
    }
    prev = a;
  }
  return prev[1];
}

function makeCandles(days: string[], seed: number, scale: number): Candle[] {
  const r = rng(seed);
  const out: Candle[] = [];
  let level = anchorLevel(days[0]!) * scale;
  for (const d of days) {
    const target = anchorLevel(d) * scale;
    // 목표로 서서히 회귀 + 일간 잡음
    level += (target - level) * 0.08 + gauss(r) * target * 0.004;
    const c = Math.max(target * 0.5, level);
    const o = c * (1 + gauss(r) * 0.002);
    const h = Math.max(o, c) * (1 + Math.abs(gauss(r)) * 0.002);
    const l = Math.min(o, c) * (1 - Math.abs(gauss(r)) * 0.002);
    const round = (v: number) => Number(v.toFixed(2));
    out.push({ d, o: round(o), h: round(h), l: round(l), c: round(c) });
  }
  return out;
}

function main() {
  const cutoff = cutoffDate(CUTOFF_MONTHS);
  mkdirSync(OUT, { recursive: true });

  const specs = [
    { id: 'usdkrw' as const, name: '원/달러 환율', from: '19900302', seed: 1, scale: 1, items: ['0000002', '0000005', '0000004', '0000003'] },
    { id: 'cnykrw' as const, name: '원/위안 환율', from: '20141201', seed: 2, scale: 0.1478, items: ['0000007', '0000008', '0000009', '0000010'] },
  ];

  for (const s of specs) {
    const days = tradingDays(s.from, cutoff);
    const file: SeriesFile = {
      id: s.id,
      name: s.name,
      source: {
        stat: '731Y003',
        items: s.items,
        org: '한국은행',
        fetchedAt: isoDate(),
        cutoff,
        dev: true,
      },
      unit: '원',
      candles: makeCandles(days, s.seed, s.scale),
    };
    writeFileSync(resolve(OUT, `${s.id}.json`), JSON.stringify(file));
    console.log(`[DEV] ${s.id}: ${file.candles.length}행 (${days[0]} ~ ${days[days.length - 1]})`);
  }

  // 기준금리: 실제 변경 이력과 비슷한 계단 (개발용)
  const steps: Array<[string, number]> = [
    ['19990506', 4.75], ['20011231', 4.0], ['20050101', 3.25], ['20070101', 4.5],
    ['20081009', 5.0], ['20081027', 4.25], ['20081107', 4.0], ['20081211', 3.0],
    ['20090112', 2.0], ['20110610', 3.25], ['20140814', 2.25], ['20160609', 1.25],
    ['20180501', 1.5], ['20200317', 0.75], ['20200528', 0.5], ['20210826', 0.75],
    ['20220714', 2.25], ['20221024', 3.0], ['20230113', 3.5], ['20241011', 3.25],
    ['20250225', 2.75],
  ];
  const cutoffN = cutoff;
  const points: Array<{ d: string; v: number }> = [];
  for (const d of tradingDays('19990506', cutoffN)) {
    let v = steps[0]![1];
    for (const [sd, sv] of steps) if (sd <= d) v = sv;
    points.push({ d, v });
  }
  writeFileSync(
    resolve(OUT, 'baserate.json'),
    JSON.stringify({
      source: { stat: '722Y001', items: ['0101000'], org: '한국은행', fetchedAt: isoDate(), cutoff, dev: true },
      points,
    }),
  );
  console.log(`[DEV] baserate: ${points.length}행`);
  console.log('주의: 합성 데이터입니다. 출시 전 `npm run data:fetch` 로 교체하세요.');
}

main();
