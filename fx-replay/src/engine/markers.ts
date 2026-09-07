/**
 * 리빌 후 자동 사건 마커 — docs/FUNCTIONAL_SPEC.md §3-5
 * daily 시나리오는 서술 문장이 없는 사실 마커만 생성한다(원칙 B).
 */
import { windowRange } from './normalize';
import { candleEnd } from '@/types';
import type { Candle, ScenarioEvent, Timeframe } from '@/types';

export interface BaseRatePoint {
  d: string;
  v: number;
}

const fmtPct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`;

/** 구간 내 기준금리 변경일 */
export function baseRateMarkers(window: Candle[], baseRate: BaseRatePoint[]): ScenarioEvent[] {
  if (window.length === 0) return [];
  const first = window[0];
  const last = window[window.length - 1];
  if (first === undefined || last === undefined) return [];
  const lastDate = candleEnd(last);

  const out: ScenarioEvent[] = [];
  let prev: number | undefined;
  for (const p of baseRate) {
    if (p.d < first.d) {
      prev = p.v;
      continue;
    }
    if (p.d > lastDate) break;
    if (prev !== undefined && p.v !== prev) {
      out.push({ d: p.d, label: `기준금리 ${prev.toFixed(2)}%→${p.v.toFixed(2)}%`, body: '' });
    }
    prev = p.v;
  }
  return out;
}

const UNIT_LABEL: Record<Timeframe, string> = { day: '하루', week: '한 주', month: '한 달' };

/** 구간 내 변동폭 상위 n봉 */
export function volatilityMarkers(window: Candle[], n = 2, tf: Timeframe = 'day'): ScenarioEvent[] {
  const moves: Array<{ d: string; pct: number }> = [];
  for (let i = 1; i < window.length; i++) {
    const prev = window[i - 1];
    const cur = window[i];
    if (prev === undefined || cur === undefined) continue;
    moves.push({ d: candleEnd(cur), pct: ((cur.c - prev.c) / prev.c) * 100 });
  }
  return moves
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, n)
    .sort((a, b) => a.d.localeCompare(b.d))
    .map((m) => ({ d: m.d, label: `${UNIT_LABEL[tf]} ${fmtPct(m.pct)}`, body: '' }));
}

export function autoMarkers(
  window: Candle[],
  baseRate: BaseRatePoint[],
  tf: Timeframe = 'day',
): ScenarioEvent[] {
  return [...baseRateMarkers(window, baseRate), ...volatilityMarkers(window, 2, tf)].sort((a, b) =>
    a.d.localeCompare(b.d),
  );
}

/** daily 해설 템플릿 — 사실만 (docs/SCREEN_FLOW.md result.daily_debrief) */
export function dailyDebrief(window: Candle[], assetName: string): string {
  const first = window[0];
  const last = window[window.length - 1];
  if (first === undefined || last === undefined) return '';
  const { high: max, low: min } = windowRange(window);
  const fmtDate = (d: string) => `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
  const fmtNum = (v: number) => v.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  return `이 구간은 ${fmtDate(first.d)}부터 ${fmtDate(candleEnd(last))}까지의 ${assetName}이었다. 기간 중 최고 ${fmtNum(max)}원, 최저 ${fmtNum(min)}원을 기록했다.`;
}
