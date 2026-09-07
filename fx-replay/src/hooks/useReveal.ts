/**
 * 리빌 트윈 — docs/FUNCTIONAL_SPEC.md §3-5 (RV-1)
 * 블라인드의 정규화 축에서 실제 값 축으로 가는 0→1 진행도를 만든다.
 * 설정에서 끄거나 블라인드가 아니면 즉시 1이다.
 */
import { useEffect, useState } from 'react';

const DURATION = 600;
/** easeOutCubic */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export function useReveal(enabled: boolean): number {
  const [p, setP] = useState(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) {
      setP(1);
      return undefined;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setP(ease(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    /**
     * 안전장치 — rAF 는 화면이 가려지면 멈춘다.
     * 그대로 두면 리빌이 0 에서 굳어 자산명이 "?" 로 남는다.
     * 시간이 지나면 무조건 끝낸다.
     */
    const guard = setTimeout(() => setP(1), DURATION + 400);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(guard);
    };
  }, [enabled]);

  return p;
}
