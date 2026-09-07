/**
 * 세이프 에어리어 — 앱인토스는 CSS `env(safe-area-inset-*)` 가 아니라 SDK `SafeArea` 를 쓰라고 한다.
 *
 * env() 를 쓰면 호스트가 이미 처리한 값과 겹쳐 이중 적용된다. fx-replay 가 실기기에서
 * 하단 탭 바가 너무 위로 올라온 문제를 겪고 확인한 사실이다. env() 는 쓰지 않는다.
 *
 * 값을 CSS 변수 `--safe-top` / `--safe-bottom` 으로 내보내 스타일에서 쓴다.
 * 토스 앱 밖(브라우저 개발)에서는 0 이다.
 */
import { useEffect, useState } from 'react';
import { SafeArea } from '@apps-in-toss/web-framework';

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const ZERO: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

const normalize = (v: Partial<Insets> | undefined): Insets => ({
  top: v?.top ?? 0,
  bottom: v?.bottom ?? 0,
  left: v?.left ?? 0,
  right: v?.right ?? 0,
});

function read(): Insets {
  try {
    return normalize(SafeArea.get());
  } catch {
    return ZERO;
  }
}

/**
 * 값을 읽어 CSS 변수로 내보낸다. 화면 모드가 바뀌면 구독으로 갱신한다.
 * 반환값은 진단용으로도 쓴다.
 */
export function useSafeArea(): Insets {
  const [insets, setInsets] = useState<Insets>(read);

  useEffect(() => {
    try {
      return SafeArea.subscribe({ onEvent: (v) => setInsets(normalize(v)) });
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--safe-top', `${insets.top}px`);
    root.setProperty('--safe-bottom', `${insets.bottom}px`);
  }, [insets]);

  return insets;
}
