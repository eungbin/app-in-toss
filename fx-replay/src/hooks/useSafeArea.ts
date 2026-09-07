/**
 * 세이프 에어리어 — 앱인토스 문서는 CSS env() 가 아니라 SDK `SafeArea` 를 쓰라고 한다.
 * 호스트가 콘텐츠 로드 전에 주입한 값을 읽고, 화면 모드가 바뀌면 구독으로 갱신한다.
 *
 * 값을 CSS 변수(--safe-top/--safe-bottom)로 내보내 스타일에서 쓴다.
 * 토스 앱 밖(브라우저)에서는 0 이다.
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

function read(): Insets {
  try {
    const v = SafeArea.get();
    return {
      top: v.top ?? 0,
      bottom: v.bottom ?? 0,
      left: v.left ?? 0,
      right: v.right ?? 0,
    };
  } catch {
    return ZERO;
  }
}

/** 값을 읽어 CSS 변수로 내보낸다. 반환값은 진단용으로도 쓴다. */
export function useSafeArea(): Insets {
  const [insets, setInsets] = useState<Insets>(read);

  useEffect(() => {
    try {
      return SafeArea.subscribe({
        onEvent: (v) =>
          setInsets({ top: v.top ?? 0, bottom: v.bottom ?? 0, left: v.left ?? 0, right: v.right ?? 0 }),
      });
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
