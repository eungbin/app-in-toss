/**
 * S03 자르기 — docs/SCREEN_FLOW.md 3장, docs/FUNCTIONAL_SPEC.md §3-4
 *
 * 크롭 프레임은 화면에 **고정**되고 사용자가 그 아래에서 사진을 움직이고 확대한다.
 * 프레임의 비율은 규격이 정하며 사용자가 바꿀 수 없다 — 그래서 모서리 핸들이 없다.
 *
 * 두 가지 한계를 함께 지킨다.
 *   커버: 사진이 프레임을 늘 덮어야 한다(빈틈이 생기면 결과에 흰 여백이 남는다).
 *   확대 금지: 프레임에 담긴 소스 영역이 목표 픽셀보다 작아지면 결과가 확대된다.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { clampCrop } from '@/engine/crop';
import { t } from '@/i18n';
import type { CropBox, SourceImage } from '@/types';
import { IconCrop } from '@/components/Icon';

interface Props {
  source: SourceImage;
  target: { w: number; h: number };
  /** 화면에 띄울 비율 문구 (예: "3.5 : 4.5") */
  ratioLabel: string;
  /** 직전에 자른 위치. [다시 자르기] 로 돌아왔을 때 그 자리에서 이어 잡는다 */
  initial?: CropBox | undefined;
  busy: boolean;
  onApply: (crop: CropBox) => void;
}

interface View {
  scale: number;
  tx: number;
  ty: number;
}

/**
 * 프레임 좌우 여백. 크게 잡으면 프레임이 좁아지고, 비율 고정이라 세로도 같이 줄어
 * 무대에 빈 배경만 남는다(42px 일 때 668px 무대에서 294px 이 비었다).
 */
const FRAME_MARGIN = 24;

export function Crop({ source, target, ratioLabel, initial, busy, onApply }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const viewRef = useRef<View | null>(null);
  viewRef.current = view;

  /* 무대 크기를 잰다 */
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* 프레임 — 무대 안에 들어가는 가장 큰 목표 비율 사각형 */
  const r = target.w / target.h;
  const availW = Math.max(0, stage.w - FRAME_MARGIN * 2);
  const availH = Math.max(0, stage.h - FRAME_MARGIN * 2);
  let fw = availW;
  let fh = fw / r;
  if (fh > availH) {
    fh = availH;
    fw = fh * r;
  }
  const fx = (stage.w - fw) / 2;
  const fy = (stage.h - fh) / 2;

  const minScale = fw > 0 ? Math.max(fw / source.width, fh / source.height) : 1;
  /** 프레임에 담기는 소스 폭이 목표보다 작아지지 않게 하는 상한 */
  const maxScale = fw > 0 ? Math.max(minScale, fw / target.w) : 1;

  /* 초기 배치 — 직전 자른 자리가 있으면 그걸 되살리고, 없으면 중앙에서 프레임을 꽉 덮는다 */
  useEffect(() => {
    if (fw <= 0) return;
    if (initial && initial.w > 0 && initial.h > 0) {
      // 확정할 때 쓴 식(crop.w = fw / scale)을 거꾸로 푼다
      const scale = Math.min(maxScale, Math.max(minScale, fw / initial.w));
      setView(
        clampView({
          scale,
          tx: fx - initial.x * scale,
          ty: fy - initial.y * scale,
        }),
      );
      return;
    }
    const scale = minScale;
    setView({
      scale,
      tx: fx + (fw - source.width * scale) / 2,
      ty: fy + (fh - source.height * scale) / 2,
    });
    // initial 은 이 화면에 들어올 때 한 번만 쓴다. 이후 조작은 view 가 갖는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fw, fh, fx, fy, minScale, maxScale, source.width, source.height]);

  /** 사진이 프레임을 덮도록 위치를 밀어 넣는다 */
  const clampView = useCallback(
    (v: View): View => {
      const iw = source.width * v.scale;
      const ih = source.height * v.scale;
      return {
        scale: v.scale,
        tx: Math.min(fx, Math.max(fx + fw - iw, v.tx)),
        ty: Math.min(fy, Math.max(fy + fh - ih, v.ty)),
      };
    },
    [fx, fy, fw, fh, source.width, source.height],
  );

  /* ── 제스처 ─────────────────────────────────────────── */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number; cx: number; cy: number } | null>(null);
  const hapticAt = useRef(0);

  const buzzAtLimit = (next: number, hit: number) => {
    if (Math.abs(next - hit) > 0.0001) return;
    const now = Date.now();
    if (now - hapticAt.current < 400) return;
    hapticAt.current = now;
    try {
      generateHapticFeedback({ type: 'softMedium' });
    } catch {
      // 지원하지 않는 기기에서는 조용히 넘어간다
    }
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const v = viewRef.current;
      if (a && b && v) {
        gesture.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          scale: v.scale,
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
        };
      }
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = viewRef.current;
    if (!v || !prev) return;

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const g = gesture.current;
      if (!a || !b || !g || g.dist === 0) return;
      const raw = g.scale * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist);
      const scale = Math.min(maxScale, Math.max(minScale, raw));
      buzzAtLimit(scale, minScale);
      buzzAtLimit(scale, maxScale);
      const rect = stageRef.current?.getBoundingClientRect();
      // 두 손가락 중심을 고정점으로 삼아 확대한다
      const ax = g.cx - (rect?.left ?? 0);
      const ay = g.cy - (rect?.top ?? 0);
      const k = scale / v.scale;
      setView(clampView({ scale, tx: ax - (ax - v.tx) * k, ty: ay - (ay - v.ty) * k }));
      return;
    }

    setView(clampView({ ...v, tx: v.tx + (e.clientX - prev.x), ty: v.ty + (e.clientY - prev.y) }));
  };

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  };

  /* ── 결과 ───────────────────────────────────────────── */
  const apply = () => {
    const v = viewRef.current;
    if (!v) return;
    const box: CropBox = {
      x: Math.round((fx - v.tx) / v.scale),
      y: Math.round((fy - v.ty) / v.scale),
      w: Math.round(fw / v.scale),
      h: Math.round(fh / v.scale),
    };
    onApply(clampCrop(box, source));
  };

  return (
    <div className="screen crop-screen">
      <div
        ref={stageRef}
        className="stage"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {view && (
          <img
            className="stage__img"
            src={source.dataUri}
            alt=""
            style={{
              left: 0,
              top: 0,
              width: source.width,
              height: source.height,
              transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
            }}
          />
        )}

        {fw > 0 && (
          <>
            <div className="mask" style={{ left: 0, right: 0, top: 0, height: fy }} />
            <div className="mask" style={{ left: 0, right: 0, top: fy + fh, bottom: 0 }} />
            <div className="mask" style={{ left: 0, width: fx, top: fy, height: fh }} />
            <div className="mask" style={{ left: fx + fw, right: 0, top: fy, height: fh }} />
            <div className="cropbox" style={{ left: fx, top: fy, width: fw, height: fh }}>
              <div className="cropbox__grid" style={{ left: 0, right: 0, top: '33.33%', height: 1 }} />
              <div className="cropbox__grid" style={{ left: 0, right: 0, top: '66.66%', height: 1 }} />
              <div className="cropbox__grid" style={{ top: 0, bottom: 0, left: '33.33%', width: 1 }} />
              <div className="cropbox__grid" style={{ top: 0, bottom: 0, left: '66.66%', width: 1 }} />
              <div className="cropbox__ratio">{ratioLabel}</div>
            </div>
          </>
        )}
      </div>

      <div className="foot" style={{ gap: 16, paddingTop: 22 }}>
        <div className="crop-hint">
          <IconCrop size={15} color="var(--gray-400)" />
          <span>{t('crop.hint')}</span>
        </div>
        <button type="button" className="btn btn--primary" onClick={apply} disabled={busy}>
          {busy && <span className="spinner" />}
          {t('crop.apply')}
        </button>
      </div>
    </div>
  );
}
