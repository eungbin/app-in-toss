/**
 * 캔들 차트 — canvas. 외부 차트 라이브러리 없음(번들 크기).
 * 블라인드에서는 정규화 값·Day 축, 리빌 후에는 실제 값·날짜 축.
 */
import { useEffect, useRef } from 'react';
import { windowRange } from '@/engine/normalize';
import type { BlindCandle, RevealedCandle } from '@/types';

export interface ChartMarker {
  /** Day 번호 */
  day: number;
  kind: 'event' | 'mine';
}

interface Props {
  candles: Array<BlindCandle | RevealedCandle>;
  /** 전체 슬롯 수 (미래는 빈 격자) */
  slots: number;
  markers?: ChartMarker[];
  /** 리빌 후 축 라벨용 */
  labels?: string[];
  height?: number;
}

const UP = '#F04452';
const DOWN = '#3182F6';
const GRID = '#EEF0F3';
const AXIS = '#8B95A1';

export function CandleChart({ candles, slots, markers = [], labels, height = 260 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const w = cv.clientWidth;
    const h = height;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padL = 8;
    const padR = 44;
    const padT = 10;
    const padB = 22;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    if (candles.length === 0) return;

    const { high: hi, low: lo } = windowRange(candles);
    const span = hi - lo || 1;
    const top = hi + span * 0.08;
    const bot = lo - span * 0.08;
    const y = (v: number) => padT + ((top - v) / (top - bot)) * plotH;
    const slotW = plotW / slots;
    const bodyW = Math.max(1.5, Math.min(8, slotW * 0.62));

    // 가로 격자 + 우측 값 라벨
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 3; i++) {
      const v = bot + ((top - bot) * i) / 3;
      const yy = y(v);
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      ctx.fillStyle = AXIS;
      ctx.textAlign = 'left';
      ctx.fillText(v.toLocaleString('ko-KR', { maximumFractionDigits: 1 }), padL + plotW + 6, yy);
    }

    // 캔들
    candles.forEach((c, i) => {
      const cx = padL + slotW * (i + 0.5);
      const rising = c.c >= c.o;
      ctx.strokeStyle = rising ? UP : DOWN;
      ctx.fillStyle = rising ? UP : DOWN;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, y(c.h));
      ctx.lineTo(cx, y(c.l));
      ctx.stroke();
      const yo = y(c.o);
      const yc = y(c.c);
      ctx.fillRect(cx - bodyW / 2, Math.min(yo, yc), bodyW, Math.max(1, Math.abs(yc - yo)));
    });

    // 마커
    for (const m of markers) {
      const cx = padL + slotW * (m.day - 0.5);
      ctx.beginPath();
      if (m.kind === 'event') {
        ctx.fillStyle = '#FFB020';
        ctx.moveTo(cx, padT + 2);
        ctx.lineTo(cx + 4, padT + 8);
        ctx.lineTo(cx, padT + 14);
        ctx.lineTo(cx - 4, padT + 8);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#191F28';
        ctx.arc(cx, h - padB + 8, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // x축 라벨
    ctx.fillStyle = AXIS;
    ctx.textAlign = 'center';
    const ticks = labels
      ? [0, Math.floor(candles.length / 2), candles.length - 1]
      : [0, Math.floor(slots / 3), Math.floor((slots * 2) / 3), slots - 1];
    for (const i of ticks) {
      if (i < 0) continue;
      const cx = padL + slotW * (i + 0.5);
      const text = labels ? (labels[i] ?? '') : `Day ${i + 1}`;
      if (text) ctx.fillText(text, cx, h - 8);
    }
  }, [candles, slots, markers, labels, height]);

  const last = candles[candles.length - 1];
  return (
    <div className="chart">
      <canvas ref={ref} style={{ width: '100%', height }} />
      <span className="sr-only">
        {last ? `Day ${last.day}, 값 ${last.c.toFixed(1)}` : '차트 준비 중'}
      </span>
    </div>
  );
}
