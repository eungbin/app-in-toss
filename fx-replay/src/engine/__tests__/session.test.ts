import { describe, expect, it } from 'vitest';
import {
  buildResult,
  convert,
  createSession,
  currentRate,
  isSessionValid,
  pause,
  reveal,
  sessionTotalP,
  setSpeed,
  start,
  tick,
} from '../session';
import type { Candle } from '@/types';

const NOW = '2026-09-07T00:00:00.000Z';

function makeCandles(n: number, priceAt: (i: number) => number): Candle[] {
  return Array.from({ length: n }, (_, i) => {
    const p = priceAt(i);
    const d = String(20000101 + i);
    return { d, o: p, h: p, l: p, c: p };
  });
}

const flat = makeCandles(10, () => 1000);

const base = () =>
  createSession({
    id: 's1',
    scenarioId: 'daily:usdkrw:0',
    series: 'usdkrw',
    timeframe: 'day',
    startIdx: 0,
    bars: 5,
    blind: true,
    startDate: flat[0]!.d,
    now: NOW,
  });

describe('session 상태 머신', () => {
  it('생성 직후 ready, Day 1', () => {
    const s = base();
    expect(s.status).toBe('ready');
    expect(s.day).toBe(1);
    expect(s.holdings).toEqual({ krw: 1_000_000, fx: 0 });
  });

  it('ready → playing → paused → playing', () => {
    let s = start(base(), NOW);
    expect(s.status).toBe('playing');
    s = pause(s, NOW);
    expect(s.status).toBe('paused');
    s = start(s, NOW);
    expect(s.status).toBe('playing');
  });

  it('playing이 아니면 tick이 무시된다', () => {
    const s = base();
    expect(tick(s, NOW).day).toBe(1);
    expect(tick(pause(start(s, NOW), NOW), NOW).day).toBe(1);
  });

  it('마지막 Day에 도달하면 finished', () => {
    let s = start(base(), NOW);
    for (let i = 0; i < 4; i++) s = tick(s, NOW);
    expect(s.day).toBe(5);
    expect(s.status).toBe('finished');
    expect(tick(s, NOW).day).toBe(5);
  });

  it('finished에서만 reveal 가능', () => {
    const playing = start(base(), NOW);
    expect(reveal(playing, NOW).status).toBe('playing');
    let s = playing;
    for (let i = 0; i < 4; i++) s = tick(s, NOW);
    expect(reveal(s, NOW).status).toBe('revealed');
  });

  it('속도 변경', () => {
    expect(setSpeed(base(), 2, NOW).speed).toBe(2);
  });

  it('현재 Day 종가로 체결된다', () => {
    const rising = makeCandles(10, (i) => 1000 + i * 100);
    let s = start(
      createSession({
        id: 's2',
        scenarioId: 'c',
        series: 'usdkrw',
        timeframe: 'day',
        startIdx: 0,
        bars: 5,
        blind: true,
        startDate: rising[0]!.d,
        now: NOW,
      }),
      NOW,
    );
    s = tick(s, NOW); // Day 2, 1100
    expect(currentRate(s, rising)).toBe(1100);
    s = convert(s, rising, 'toFx', 50, NOW);
    expect(s.conversions[0]).toMatchObject({ day: 2, rate: 1100, amountP: 500_000 });
    expect(sessionTotalP(s, rising)).toBeCloseTo(1_000_000, 6);
    s = tick(s, NOW); // Day 3, 1200
    expect(sessionTotalP(s, rising)).toBeCloseTo(500_000 + (500_000 / 1100) * 1200, 6);
  });

  it('잔고가 없으면 전환이 무시된다', () => {
    let s = start(base(), NOW);
    s = convert(s, flat, 'toKrw', 100, NOW);
    expect(s.conversions).toHaveLength(0);
  });

  it('revealed 이후에는 전환 불가', () => {
    let s = start(base(), NOW);
    for (let i = 0; i < 4; i++) s = tick(s, NOW);
    s = reveal(s, NOW);
    expect(convert(s, flat, 'toFx', 50, NOW).conversions).toHaveLength(0);
  });

  it('결과는 마지막 Day 종가 기준', () => {
    const rising = makeCandles(10, (i) => 1000 + i * 100);
    let s = start(
      createSession({
        id: 's3',
        scenarioId: 'c',
        series: 'usdkrw',
        timeframe: 'day',
        startIdx: 0,
        bars: 5,
        blind: true,
        startDate: rising[0]!.d,
        now: NOW,
      }),
      NOW,
    );
    s = convert(s, rising, 'toFx', 100, NOW); // Day1 1000에 전액
    for (let i = 0; i < 4; i++) s = tick(s, NOW);
    const r = buildResult(s, rising, NOW);
    expect(r.startDate).toBe(rising[0]!.d);
    expect(r.endDate).toBe(rising[4]!.d);
    expect(r.finalP).toBeCloseTo(1_400_000, 6); // 1400/1000
    expect(r.benchmarkP).toBe(1_000_000);
    expect(r.diffP).toBeCloseTo(400_000, 6);
  });

  it('아무것도 안 하면 결과는 벤치마크와 같다', () => {
    let s = start(base(), NOW);
    for (let i = 0; i < 4; i++) s = tick(s, NOW);
    const r = buildResult(s, flat, NOW);
    expect(r.finalP).toBe(1_000_000);
    expect(r.diffP).toBe(0);
  });

  it('시계열이 바뀌어 시작 날짜가 어긋나면 세션 무효', () => {
    const s = base();
    expect(isSessionValid(s, flat)).toBe(true);
    expect(isSessionValid(s, flat.slice(1))).toBe(false);
    expect(isSessionValid({ ...s, startIdx: 8 }, flat)).toBe(false);
  });
});
