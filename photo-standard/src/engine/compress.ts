/**
 * 용량 압축 — docs/FUNCTIONAL_SPEC.md §3-6
 *
 * 목표 이하를 만족하는 **가장 높은 품질**을 이분 탐색으로 찾는다. 무조건 낮추지 않는다.
 *
 * Canvas 를 직접 부르지 않고 `encode` 를 주입받는다. 그래야 순수 함수로 테스트할 수 있다.
 * Canvas 를 쓰는 쪽은 src/engine/canvas.ts 다.
 */
import { Q_HI, Q_ITER, Q_LO } from '@/constants';

export interface Encoded {
  dataUri: string;
  bytes: number;
  quality: number;
}

/** 품질 q 로 인코딩한 결과를 돌려주는 함수 */
export type Encoder = (q: number) => Encoded;

/**
 * maxBytes 이하가 되는 최대 품질을 찾는다.
 * 최저 품질에서도 초과하면 null 을 돌려준다 — 실패를 숨기지 않는다(CV-4).
 */
export function bisectQuality(encode: Encoder, maxBytes: number): Encoded | null {
  let lo = Q_LO;
  let hi = Q_HI;
  let best: Encoded | null = null;

  for (let i = 0; i < Q_ITER; i++) {
    const mid = (lo + hi) / 2;
    const out = encode(mid);
    if (out.bytes <= maxBytes) {
      best = out;
      lo = mid; // 더 좋은 품질을 노린다
    } else {
      hi = mid;
    }
  }

  if (best !== null) return best;

  // 탐색 구간이 전부 초과였다. 하한을 한 번 더 시도한다.
  const floor = encode(Q_LO);
  return floor.bytes <= maxBytes ? floor : null;
}
