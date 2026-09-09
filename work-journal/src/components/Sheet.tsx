/**
 * 바텀시트·다이얼로그 공통 껍데기.
 * 백버튼 = 닫기(docs/SCREEN_FLOW.md 1장), **아래로 끌어서 닫기**도 된다.
 *
 * 드래그는 손잡이와 제목 줄에서만 시작한다. 본문에서 끌면 스크롤과 다투게 되고,
 * 안드로이드에서 스크롤 도중에 시트가 닫히는 사고가 난다.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { pushBackHandler } from '@ait/kit';

interface Props {
  onClose: () => void;
  children: ReactNode;
}

/** 이만큼 내리면 닫는다 */
const CLOSE_PX = 96;
/** 빠르게 튕기면 짧게 내려도 닫는다 (px/ms) */
const CLOSE_VELOCITY = 0.55;

export function Sheet({ onClose, children }: Props) {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; startY: number; startAt: number } | null>(null);

  useEffect(
    () =>
      pushBackHandler(() => {
        onClose();
        return true;
      }),
    [onClose],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    // 본문·푸터에서 시작한 제스처는 스크롤·버튼 몫이다
    if (el.closest('.sheet__body') || el.closest('.sheet__foot')) return;
    drag.current = { id: e.pointerId, startY: e.clientY, startAt: e.timeStamp };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 캡처를 못 잡아도 드래그 자체는 되어야 한다. 여기서 던지면 시트가 굳는다
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    // 위로는 끌리지 않는다 — 시트가 화면 위로 떠오르면 배경이 드러난다
    setDy(Math.max(0, e.clientY - d.startY));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);

    const moved = Math.max(0, e.clientY - d.startY);
    const elapsed = Math.max(1, e.timeStamp - d.startAt);
    if (moved > CLOSE_PX || (moved > 24 && moved / elapsed > CLOSE_VELOCITY)) {
      onClose();
      return;
    }
    setDy(0);
  };

  return (
    <div className="dim dim--sheet" onClick={onClose}>
      <div
        className="sheet"
        data-dragging={dragging ? 'true' : undefined}
        style={dy > 0 ? { transform: `translateY(${dy}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="sheet__grip" />
        {children}
      </div>
    </div>
  );
}

export function Dialog({ onClose, children }: Props) {
  useEffect(
    () =>
      pushBackHandler(() => {
        onClose();
        return true;
      }),
    [onClose],
  );
  return (
    <div className="dim dim--dialog" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
