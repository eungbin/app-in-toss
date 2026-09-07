/**
 * 사건을 봉에 매핑한다 — 챕터의 '사건 당일 자동 정지'와 리빌 마커가 공유한다.
 *
 * 매칭 규칙: 사건일 이후 처음으로 끝나는 봉에 붙인다.
 *   - 일봉 + 거래일 사건  → 그날 봉
 *   - 일봉 + 휴장일 사건  → 다음 거래일 봉 (시장이 반응한 날)
 *   - 주봉·월봉          → 사건이 속한 기간의 봉
 */
import { candleEnd } from '@/types';
import type { Candle, ScenarioEvent } from '@/types';

/** 봉 번호(1부터) → 그 봉에 걸린 사건들 */
export function mapEventsToBars(
  candles: Candle[],
  startIdx: number,
  bars: number,
  events: ScenarioEvent[],
): Map<number, ScenarioEvent[]> {
  const out = new Map<number, ScenarioEvent[]>();
  const first = candles[startIdx];
  if (first === undefined) return out;

  for (const e of events) {
    // 구간 시작 전 사건은 붙이지 않는다
    if (e.d < first.d) continue;
    let bar = -1;
    for (let i = 0; i < bars; i++) {
      const c = candles[startIdx + i];
      if (c === undefined) break;
      if (candleEnd(c) >= e.d) {
        bar = i + 1;
        break;
      }
    }
    if (bar < 0) continue; // 구간을 벗어난 사건
    const list = out.get(bar);
    if (list) list.push(e);
    else out.set(bar, [e]);
  }
  return out;
}
