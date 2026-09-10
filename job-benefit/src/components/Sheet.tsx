/**
 * 바텀시트 공통 껍데기 — docs/SCREEN_FLOW.md 1-1, 2-1
 *
 * 뒤로가기로 닫히고, **아래로 끌어서도 닫힌다.** 드래그는 손잡이와 제목 줄에서만
 * 시작한다 — 본문에서 끌리게 하면 스크롤과 다투고 스크롤 도중에 시트가 닫힌다
 * (work-journal 2026-09-10). 진입 즉시 자동으로 열지 않는다.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { pushBackHandler } from '@ait/kit';
import { Icon } from './Icon';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: 'sheet' | 'dialog';
}

/** 이만큼 내리면 닫는다 */
const CLOSE_PX = 96;
/** 빠르게 튕기면 짧게 내려도 닫는다 (px/ms) */
const CLOSE_VELOCITY = 0.55;

export function Sheet({ title, onClose, children, variant = 'sheet' }: Props) {
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
    if (variant !== 'sheet') return;
    const el = e.target as HTMLElement;
    // 본문에서 시작한 제스처는 스크롤 몫이다
    if (el.closest('.sheet__body') || el.closest('.sheet__scroll')) return;
    drag.current = { id: e.pointerId, startY: e.clientY, startAt: e.timeStamp };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 캡처를 못 잡아도 드래그는 되어야 한다. 여기서 던지면 시트가 굳는다
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    // 위로는 끌리지 않는다 — 시트가 떠오르면 배경이 드러난다
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
    <div className="scrim" role="presentation" onClick={onClose}>
      <div
        className={variant === 'sheet' ? 'sheet' : 'dialog'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-dragging={dragging ? 'true' : undefined}
        style={dy > 0 ? { transform: `translateY(${dy}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="sheet__close" aria-label="닫기" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
