/** 번들 데이터 로더 */
import { resample } from '@/engine/resample';
import type { Candle, Scenario, SeriesFile, SeriesId, Timeframe } from '@/types';
import usdkrw from './series/usdkrw.json';
import cnykrw from './series/cnykrw.json';
import baserate from './series/baserate.json';
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

export const SERIES: Record<SeriesId, SeriesFile> = {
  usdkrw: usdkrw as SeriesFile,
  cnykrw: cnykrw as SeriesFile,
};

export const BASE_RATE = baserate as {
  source: { stat: string; fetchedAt: string; cutoff: string };
  points: Array<{ d: string; v: number }>;
};

/** 타임프레임별 시계열. 처음 요청할 때 한 번만 집계한다. */
const resampled = new Map<string, Candle[]>();

export function getCandles(series: SeriesId, tf: Timeframe = 'day'): Candle[] {
  if (tf === 'day') return SERIES[series].candles;
  const key = `${series}:${tf}`;
  const cached = resampled.get(key);
  if (cached) return cached;
  const built = resample(SERIES[series].candles, tf);
  resampled.set(key, built);
  return built;
}

/** 연도순 */
export const SCENARIOS: Scenario[] = [
  s2005, s1997, s1998, s2008, s2009, s2015, s2020, s2022, wk2020, mo1998,
].map((s) => s as Scenario).sort((a, b) => a.start.localeCompare(b.start));

export const getScenario = (id: string): Scenario | undefined =>
  SCENARIOS.find((s) => s.id === id);

/** 같은 시계열·같은 타임프레임의 챕터 */
export const chaptersOf = (series: SeriesId, tf: Timeframe = 'day') =>
  SCENARIOS.filter((s) => s.series === series && (s.timeframe ?? 'day') === tf);

/** 데이터가 개발용 합성인지 */
export const isDevData = SERIES.usdkrw.source.dev === true;
