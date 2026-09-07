/**
 * 번들 데이터 로더.
 *
 * 시계열 본문(캔들)은 gzip 160KB 로 초기 번들의 절반이 넘는데, 화면 대부분은
 * 이름·출처·기간 같은 메타데이터만 쓴다. 그래서 메타는 정적으로 두고
 * 캔들과 기준금리는 동적 import 로 분리한다(별도 청크).
 *
 * 캔들이 필요한 곳은 플레이·결과와 구간 추첨뿐이고, 그 전에 ensureSeries() 가 끝난다.
 */
import { resample } from '@/engine/resample';
import type { Candle, Scenario, SeriesId, Timeframe } from '@/types';
import meta from './series-meta.json';
import s2005 from './scenarios/krw-2005-strong.json';
import s1997 from './scenarios/krw-1997-crisis.json';
import s1998 from './scenarios/krw-1998-recovery.json';
import s2008 from './scenarios/krw-2008-gfc.json';
import s2009 from './scenarios/krw-2009-rebound.json';
import s2020 from './scenarios/krw-2020-pandemic.json';
import s2022 from './scenarios/krw-2022-dollar.json';
import s2015 from './scenarios/cny-2015-devaluation.json';
import wk2020 from './scenarios/krw-2020-2021-weekly.json';
import mo1998 from './scenarios/krw-1998-2007-monthly.json';

/* ── 메타데이터 (정적, 4KB) ──────────────────────────────── */

export interface SeriesMeta {
  id: SeriesId;
  name: string;
  unit: string;
  source: { stat: string; items: string[]; org: string; fetchedAt: string; cutoff: string; dev?: boolean };
  firstDate: string;
  lastDate: string;
  count: number;
}

export const SERIES: Record<SeriesId, SeriesMeta> = Object.fromEntries(
  (meta.series as SeriesMeta[]).map((s) => [s.id, s]),
) as Record<SeriesId, SeriesMeta>;

export const BASE_RATE_META = meta.baseRate as {
  source: SeriesMeta['source'];
  firstDate: string;
  lastDate: string;
  count: number;
};

/** 데이터가 개발용 합성인지 */
export const isDevData = SERIES.usdkrw.source.dev === true;

/* ── 시계열 본문 (지연 로딩) ──────────────────────────────── */

export interface BaseRatePoint {
  d: string;
  v: number;
}

const candlesById = new Map<SeriesId, Candle[]>();
let baseRatePoints: BaseRatePoint[] = [];
let loading: Promise<void> | null = null;

/** 캔들·기준금리를 한 번만 불러온다. 여러 번 불러도 요청은 한 번이다. */
export function ensureSeries(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const [usd, cny, base] = await Promise.all([
      import('./series/usdkrw.json'),
      import('./series/cnykrw.json'),
      import('./series/baserate.json'),
    ]);
    candlesById.set('usdkrw', (usd.default as { candles: Candle[] }).candles);
    candlesById.set('cnykrw', (cny.default as { candles: Candle[] }).candles);
    baseRatePoints = (base.default as { points: BaseRatePoint[] }).points;
  })();
  return loading;
}

/** 로드 완료 여부 */
export const seriesLoaded = (): boolean => candlesById.size > 0;

function rawCandles(series: SeriesId): Candle[] {
  const c = candlesById.get(series);
  if (c === undefined) {
    throw new Error(`시계열이 아직 로드되지 않았습니다: ${series}. ensureSeries() 를 먼저 호출하세요.`);
  }
  return c;
}

export const baseRatePointsOf = (): BaseRatePoint[] => baseRatePoints;

/** 타임프레임별 시계열. 처음 요청할 때 한 번만 집계한다. */
const resampled = new Map<string, Candle[]>();

export function getCandles(series: SeriesId, tf: Timeframe = 'day'): Candle[] {
  if (tf === 'day') return rawCandles(series);
  const key = `${series}:${tf}`;
  const cached = resampled.get(key);
  if (cached) return cached;
  const built = resample(rawCandles(series), tf);
  resampled.set(key, built);
  return built;
}

/* ── 시나리오 (정적, 작다) ────────────────────────────────── */

/** 연도순 */
export const SCENARIOS: Scenario[] = [
  s2005, s1997, s1998, s2008, s2009, s2015, s2020, s2022, wk2020, mo1998,
]
  .map((s) => s as Scenario)
  .sort((a, b) => a.start.localeCompare(b.start));

export const getScenario = (id: string): Scenario | undefined => SCENARIOS.find((s) => s.id === id);

/** 같은 시계열·같은 타임프레임의 챕터 */
export const chaptersOf = (series: SeriesId, tf: Timeframe = 'day') =>
  SCENARIOS.filter((s) => s.series === series && (s.timeframe ?? 'day') === tf);
