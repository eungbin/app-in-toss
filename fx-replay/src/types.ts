/** 데이터 모델 — docs/FUNCTIONAL_SPEC.md §1 */

import type { AnonProfile } from '@ait/kit';

export type SeriesId = 'usdkrw' | 'cnykrw';

/** 봉 하나가 담는 기간 */
export type Timeframe = 'day' | 'week' | 'month';

export interface Candle {
  /** YYYYMMDD. 집계봉에서는 기간의 첫 거래일 */
  d: string;
  /** 집계봉에서만: 기간의 마지막 거래일 */
  de?: string;
  o: number;
  h: number;
  l: number;
  c: number;
  /** 시·고·저가 결손으로 종가로 채운 날 */
  f?: true;
}

/** 봉이 덮는 마지막 날짜 (일봉이면 자기 자신) */
export const candleEnd = (c: Candle): string => c.de ?? c.d;

export interface SeriesSource {
  /** ECOS 통계표 코드 */
  stat: string;
  items: string[];
  org: '한국은행';
  /** YYYY-MM-DD */
  fetchedAt: string;
  /** YYYYMMDD, 이 날짜 이후 데이터는 번들에 없다 */
  cutoff: string;
  /** 개발용 합성 데이터 표식. 프로덕션 빌드에서 발견되면 빌드 실패 */
  dev?: true;
}

export interface SeriesFile {
  id: SeriesId;
  /** 리빌 후에만 UI 노출 */
  name: string;
  source: SeriesSource;
  unit: '원';
  candles: Candle[];
}

export interface ScenarioEvent {
  /** YYYYMMDD */
  d: string;
  /** ≤ 14자 */
  label: string;
  /** ≤ 80자 */
  body: string;
}

export interface Scenario {
  id: string;
  kind: 'chapter' | 'daily';
  title: string;
  series: SeriesId;
  /** 봉 단위. 없으면 일봉 */
  timeframe?: Timeframe;
  /** YYYYMMDD — 이 날 이후 첫 봉이 1번 봉 */
  start: string;
  /** 한 판의 봉 개수 */
  bars: number;
  /** 1x 기준 한 봉 진행 간격(ms). 없으면 기본값 */
  tickMs?: number;
  blind: boolean;
  free: boolean;
  productId?: string;
  intro: string[];
  events: ScenarioEvent[];
  debrief: string[];
  sources?: string[];
}

export type ConvertDir = 'toFx' | 'toKrw';
export type ConvertRatio = 25 | 50 | 100;

export interface Conversion {
  day: number;
  dir: ConvertDir;
  ratio: ConvertRatio;
  /** 체결 환율 (해당 Day 종가) */
  rate: number;
  /** 이동한 금액, P 기준 */
  amountP: number;
}

export interface Holdings {
  /** 원화 포인트 */
  krw: number;
  /** 외화 단위(가상) */
  fx: number;
}

export type SessionStatus = 'ready' | 'playing' | 'paused' | 'finished' | 'revealed';

export interface PlaySession {
  id: string;
  /** chapter id 또는 "daily:<series>:<startIdx>" */
  scenarioId: string;
  series: SeriesId;
  timeframe: Timeframe;
  startIdx: number;
  /** 한 판의 봉 개수 */
  bars: number;
  /** 1x 기준 한 봉 진행 간격(ms) */
  tickMs: number;
  blind: boolean;
  /** 현재 진행한 봉 번호 (1..bars) */
  day: number;
  speed: 1 | 2;
  status: SessionStatus;
  holdings: Holdings;
  conversions: Conversion[];
  /** 복원 시 인덱스 불일치 검증용 */
  startDate: string;
  startedAt: string;
  updatedAt: string;
}

export interface PlayResult {
  sessionId: string;
  scenarioId: string;
  series: SeriesId;
  startDate: string;
  endDate: string;
  finalP: number;
  benchmarkP: number;
  diffP: number;
  conversions: Conversion[];
  completedAt: string;
}

export interface ReplayNote {
  id: string;
  result: PlayResult;
  /** ≤ 100자 */
  memo: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  earnedAt: string;
}

export interface Quota {
  /** YYYY-MM-DD 로컬 */
  date: string;
  used: number;
  bonus: number;
}

export interface Entitlements {
  premium: boolean;
  chapters: string[];
  syncedAt?: string;
  source: 'local' | 'server';
}

export interface Profile extends AnonProfile {
  /** v1.1 토스 로그인 */
  userKey?: string;
}

/** 블라인드 중 뷰에 전달되는 캔들 — 날짜·원값 없음 */
export interface BlindCandle {
  day: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

/** 리빌 후 뷰에 전달되는 캔들 */
export interface RevealedCandle extends Candle {
  day: number;
}
