/**
 * 캔들 차트 — canvas. 외부 차트 라이브러리 없음(번들 크기).
 * 블라인드에서는 정규화 값·Day 축, 리빌 후에는 실제 값·날짜 축.
 *
 * 리드인: 진입 이전 구간을 흐리게 깔아 1봉째부터 차트가 차 보이게 한다.
 * 이게 없으면 초반에 화면 대부분이 빈 격자라 차트가 고장 난 것처럼 보인다.
 */
import { useEffect, useRef } from 'react';
import { candleHigh, candleLow, windowRange } from '@/engine/normalize';
import type { BlindCandle, RevealedCandle } from '@/types';

export interface ChartMarker {
  /** 봉 번호(1부터). 리드인은 제외한 본 구간 기준 */
  day: number;
  kind: 'event' | 'mine';
}

type Bar = BlindCandle | RevealedCandle;

interface Props {
  candles: Bar[];
  /** 본 구간의 전체 슬롯 수 (미래는 빈 격자) */
  slots: number;
  /** 진입 이전 구간 (흐리게) */
  leadIn?: Bar[];
  markers?: ChartMarker[];
  /** 리빌 후 축 라벨용 */
  labels?: string[];
  /** labels 가 없을 때 눈금 접두어. 기본 "Day " */
  unitPrefix?: string;
  height?: number;
}

const UP = '#F04452';
const DOWN = '#3182F6';
const MUTED = '#C9D0D8';
const GRID = '#EEF0F3';
const AXIS = '#8B95A1';
const ENTRY = '#D1D6DB';

export function CandleChart({
  candles,
  slots,
  leadIn = [],
  markers = [],
  labels,
  unitPrefix = 'Day ',
  height = 260,
}: Props) {
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
    if (candles.length === 0) return;

    const padL = 8;
    const padR = 46;
    const padT = 10;
    const padB = 22;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // 스케일은 리드인까지 포함해 잡는다. 진입 시점에 축이 튀지 않는다.
    const { high: hi, low: lo } = windowRange([...leadIn, ...candles]);
    const span = hi - lo || 1;
    const top = hi + span * 0.08;
    const bot = lo - span * 0.08;
    const y = (v: number) => padT + ((top - v) / (top - bot)) * plotH;

    const total = leadIn.length + slots;
    const slotW = plotW / total;
    const bodyW = Math.max(1.5, Math.min(9, slotW * 0.62));
    const slotX = (i: number) => padL + slotW * (i + 0.5);

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

    const drawCandle = (c: Bar, i: number, muted: boolean) => {
      const cx = slotX(i);
      const color = muted ? MUTED : c.c >= c.o ? UP : DOWN;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, y(candleHigh(c)));
      ctx.lineTo(cx, y(candleLow(c)));
      ctx.stroke();
      const yo = y(c.o);
      const yc = y(c.c);
      ctx.fillRect(cx - bodyW / 2, Math.min(yo, yc), bodyW, Math.max(1, Math.abs(yc - yo)));
    };

    leadIn.forEach((c, i) => drawCandle(c, i, true));

    // 진입 지점 구분선
    if (leadIn.length > 0) {
      const x = padL + slotW * leadIn.length;
      ctx.strokeStyle = ENTRY;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    candles.forEach((c, i) => drawCandle(c, leadIn.length + i, false));

    // 마커
    for (const m of markers) {
      const cx = slotX(leadIn.length + m.day - 1);
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

    // x축 라벨 — 본 구간 기준. 겹치는 눈금은 버린다
    ctx.fillStyle = AXIS;
    ctx.textAlign = 'center';
    const ticks = labels
      ? [0, Math.floor(candles.length / 2), candles.length - 1]
      : [0, Math.floor(slots / 3), Math.floor((slots * 2) / 3), slots - 1];

    const placed: Array<{ x: number; half: number }> = [];
    const GAP = 8;
    for (const i of ticks) {
      if (i < 0) continue;
      const text = labels ? (labels[i] ?? '') : `${unitPrefix}${i + 1}`;
      if (!text) continue;
      const half = ctx.measureText(text).width / 2;
      // 가장자리 라벨이 잘리지 않게 안쪽으로 당긴다
      const cx = slotX(leadIn.length + i);
      const x = Math.min(Math.max(cx, padL + half), padL + plotW - half);
      // 이미 그린 라벨과 겹치면 건너뛴다
      const collides = placed.some((p) => Math.abs(p.x - x) < p.half + half + GAP);
      if (collides) continue;
      placed.push({ x, half });
      ctx.fillText(text, x, h - 8);
    }
  }, [candles, slots, leadIn, markers, labels, unitPrefix, height]);

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
