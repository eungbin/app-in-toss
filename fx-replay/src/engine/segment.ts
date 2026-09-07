/**
 * 오늘의 리플레이 무작위 구간 — docs/FUNCTIONAL_SPEC.md §3-4 (SC-2)
 */
import type { Candle, Scenario } from '@/types';
import { CHAPTER_OVERLAP_MAX, SEGMENT_EXCLUDE_RADIUS } from '@/constants';

export interface PickSegmentInput {
  candles: Candle[];
  bars: number;
  /** 최근 사용한 시작 인덱스 (최대 RECENT_SEGMENTS개) */
  recent: number[];
  /** 같은 시계열의 챕터 시나리오 */
  chapters: Pick<Scenario, 'start' | 'bars'>[];
  /** 0 이상 1 미만 난수. 기본은 crypto */
  random?: () => number;
}

export interface PickSegmentResult {
  startIdx: number;
  /** recent가 가득 차 초기화되었는지 */
  recentCleared: boolean;
}

function chapterRanges(candles: Candle[], chapters: Pick<Scenario, 'start' | 'bars'>[]) {
  const ranges: Array<[number, number]> = [];
  for (const ch of chapters) {
    const idx = candles.findIndex((c) => c.d === ch.start);
    if (idx >= 0) ranges.push([idx, idx + ch.bars - 1]);
  }
  return ranges;
}

/** 두 구간이 겹치는 거래일 수 */
function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart) + 1);
}

function isExcluded(
  i: number,
  bars: number,
  recent: number[],
  ranges: Array<[number, number]>,
): boolean {
  for (const r of recent) {
    if (Math.abs(i - r) <= SEGMENT_EXCLUDE_RADIUS) return true;
  }
  const end = i + bars - 1;
  for (const [s, e] of ranges) {
    if (overlap(i, end, s, e) >= CHAPTER_OVERLAP_MAX) return true;
  }
  return false;
}

function defaultRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] ?? 0) / 2 ** 32;
}

export function pickSegment(input: PickSegmentInput): PickSegmentResult {
  const { candles, bars, chapters } = input;
  const random = input.random ?? defaultRandom;
  const maxStart = candles.length - bars;
  if (maxStart < 0) throw new Error('series shorter than play length');

  const ranges = chapterRanges(candles, chapters);

  const collect = (recent: number[]) => {
    const out: number[] = [];
    for (let i = 0; i <= maxStart; i++) {
      if (!isExcluded(i, bars, recent, ranges)) out.push(i);
    }
    return out;
  };

  let recentCleared = false;
  let candidates = collect(input.recent);
  if (candidates.length === 0) {
    recentCleared = true;
    candidates = collect([]);
  }
  if (candidates.length === 0) throw new Error('no eligible segment');

  const pickedIdx = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  const startIdx = candidates[pickedIdx];
  if (startIdx === undefined) throw new Error('segment pick failed');
  return { startIdx, recentCleared };
}

export const dailyScenarioId = (series: string, startIdx: number) => `daily:${series}:${startIdx}`;
