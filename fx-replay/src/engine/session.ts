/**
 * 리플레이 세션 상태 머신 — docs/FUNCTIONAL_SPEC.md §3-3
 *   ready → playing ⇄ paused → finished → revealed
 * 순수 함수. 타이머·저장은 호출 측(훅)이 담당한다.
 */
import type {
  Candle,
  ConvertDir,
  ConvertRatio,
  PlayResult,
  PlaySession,
  SeriesId,
  Timeframe,
} from '@/types';
import { candleEnd } from '@/types';
import { START_P, TICK_MS } from '@/constants';
import { applyConversion, canConvert, initialHoldings, totalP } from './position';

export interface CreateSessionInput {
  id: string;
  scenarioId: string;
  series: SeriesId;
  timeframe: Timeframe;
  startIdx: number;
  bars: number;
  tickMs?: number;
  /** 설정의 재생 속도 기본값. 없으면 1x */
  speed?: 1 | 2;
  blind: boolean;
  startDate: string;
  now: string;
}

export function createSession(input: CreateSessionInput): PlaySession {
  return {
    id: input.id,
    scenarioId: input.scenarioId,
    series: input.series,
    timeframe: input.timeframe,
    startIdx: input.startIdx,
    bars: input.bars,
    tickMs: input.tickMs ?? TICK_MS,
    blind: input.blind,
    day: 1,
    speed: input.speed ?? 1,
    status: 'ready',
    holdings: initialHoldings(),
    conversions: [],
    startDate: input.startDate,
    startedAt: input.now,
    updatedAt: input.now,
  };
}

const touch = (s: PlaySession, now: string): PlaySession => ({ ...s, updatedAt: now });

export function start(s: PlaySession, now: string): PlaySession {
  if (s.status !== 'ready' && s.status !== 'paused') return s;
  return touch({ ...s, status: 'playing' }, now);
}

export function pause(s: PlaySession, now: string): PlaySession {
  if (s.status !== 'playing') return s;
  return touch({ ...s, status: 'paused' }, now);
}

export function setSpeed(s: PlaySession, speed: 1 | 2, now: string): PlaySession {
  return touch({ ...s, speed }, now);
}

/** 하루 진행. 마지막 날에 도달하면 finished */
export function tick(s: PlaySession, now: string): PlaySession {
  if (s.status !== 'playing') return s;
  if (s.day >= s.bars) return touch({ ...s, status: 'finished' }, now);
  const day = s.day + 1;
  const status = day >= s.bars ? 'finished' : 'playing';
  return touch({ ...s, day, status }, now);
}

export function reveal(s: PlaySession, now: string): PlaySession {
  if (s.status !== 'finished') return s;
  return touch({ ...s, status: 'revealed' }, now);
}

/** 현재 Day의 종가 */
export function currentRate(s: PlaySession, candles: Candle[]): number {
  const c = candles[s.startIdx + s.day - 1];
  if (c === undefined) throw new Error(`candle out of range: day ${s.day}`);
  return c.c;
}

export function convert(
  s: PlaySession,
  candles: Candle[],
  dir: ConvertDir,
  ratio: ConvertRatio,
  now: string,
): PlaySession {
  if (s.status === 'revealed') return s;
  const rate = currentRate(s, candles);
  if (!canConvert(s.holdings, dir, rate)) return s;
  const { holdings, conversion } = applyConversion(s.holdings, s.day, dir, ratio, rate);
  return touch({ ...s, holdings, conversions: [...s.conversions, conversion] }, now);
}

/** 현재 총 P */
export function sessionTotalP(s: PlaySession, candles: Candle[]): number {
  return totalP(s.holdings, currentRate(s, candles));
}

export function buildResult(s: PlaySession, candles: Candle[], now: string): PlayResult {
  const lastIdx = s.startIdx + s.bars - 1;
  const last = candles[lastIdx];
  const first = candles[s.startIdx];
  if (last === undefined || first === undefined) throw new Error('result range out of bounds');
  const finalP = totalP(s.holdings, last.c);
  return {
    sessionId: s.id,
    scenarioId: s.scenarioId,
    series: s.series,
    timeframe: s.timeframe,
    bars: s.bars,
    startDate: first.d,
    endDate: candleEnd(last),
    finalP,
    benchmarkP: START_P,
    diffP: finalP - START_P,
    conversions: s.conversions,
    completedAt: now,
  };
}

/**
 * 저장된 세션이 현재 시계열과 맞는지 검증.
 * 시계열 파일이 갱신되어 인덱스가 밀리면 세션을 폐기해야 한다.
 */
export function isSessionValid(s: PlaySession, candles: Candle[]): boolean {
  if (s.startIdx < 0 || s.startIdx + s.bars > candles.length) return false;
  return candles[s.startIdx]?.d === s.startDate;
}
