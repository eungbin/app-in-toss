/**
 * 공유 카드 이미지 — docs/FUNCTIONAL_SPEC.md §3-15 (US-4)
 * 결과 P·차이 P는 넣지 않는다(원칙 C). 실제 차트와 서술형 문구만 담는다.
 */
import { windowRange } from '@/engine/normalize';
import type { Conversion, RevealedCandle } from '@/types';

const W = 1080;
const H = 1350;

export interface ShareCardInput {
  candles: RevealedCandle[];
  conversions: Conversion[];
  /** "원/달러 환율" */
  assetName: string;
  /** YYYYMMDD */
  startDate: string;
  endDate: string;
  /** "출처: ECOS(한국은행, …), 수집일 …" */
  sourceLine: string;
  appName: string;
}

const fmtYm = (d: string) => `${d.slice(0, 4)}년 ${Number(d.slice(4, 6))}월`;
const fmtDate = (d: string) => `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;

/** 공유 문구 — 성과가 아니라 경험을 말한다 */
export const shareHeadline = (startDate: string) => `나는 ${fmtYm(startDate)}을 이렇게 지나왔다`;

/** 카드를 그려 base64(PNG, 접두사 없음)로 반환한다 */
export function renderShareCard(input: ShareCardInput): string | null {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;

  const font = (size: number, weight = 400) =>
    `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", system-ui, sans-serif`;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  const pad = 80;

  // 헤드라인
  ctx.fillStyle = '#191F28';
  ctx.font = font(60, 700);
  ctx.textBaseline = 'top';
  ctx.fillText(shareHeadline(input.startDate), pad, 110);

  // 자산·기간
  ctx.fillStyle = '#6B7684';
  ctx.font = font(32);
  ctx.fillText(
    `${input.assetName} · ${fmtDate(input.startDate)} ~ ${fmtDate(input.endDate)}`,
    pad,
    200,
  );

  // 차트
  const cx0 = pad;
  const cy0 = 300;
  const cw = W - pad * 2;
  const ch = 700;
  const cs = input.candles;
  if (cs.length > 0) {
    const { high: hi, low: lo } = windowRange(cs);
    const span = hi - lo || 1;
    const top = hi + span * 0.1;
    const bot = lo - span * 0.1;
    const y = (v: number) => cy0 + ((top - v) / (top - bot)) * ch;
    const slotW = cw / cs.length;
    const bodyW = Math.max(3, Math.min(14, slotW * 0.6));

    ctx.strokeStyle = '#EEF0F3';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 3; i++) {
      const yy = cy0 + (ch * i) / 3;
      ctx.beginPath();
      ctx.moveTo(cx0, yy);
      ctx.lineTo(cx0 + cw, yy);
      ctx.stroke();
    }

    cs.forEach((c, i) => {
      const x = cx0 + slotW * (i + 0.5);
      const rising = c.c >= c.o;
      ctx.strokeStyle = rising ? '#F04452' : '#3182F6';
      ctx.fillStyle = rising ? '#F04452' : '#3182F6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y(c.h));
      ctx.lineTo(x, y(c.l));
      ctx.stroke();
      const yo = y(c.o);
      const yc = y(c.c);
      ctx.fillRect(x - bodyW / 2, Math.min(yo, yc), bodyW, Math.max(2, Math.abs(yc - yo)));
    });

    // 내 전환 지점
    ctx.fillStyle = '#191F28';
    for (const cv2 of input.conversions) {
      const c = cs[cv2.day - 1];
      if (!c) continue;
      const x = cx0 + slotW * (cv2.day - 0.5);
      ctx.beginPath();
      ctx.arc(x, y(c.c), 11, 0, Math.PI * 2);
      ctx.fill();
    }

    // 기간 최고·최저
    ctx.fillStyle = '#6B7684';
    ctx.font = font(28);
    ctx.fillText(`기간 최저 ${lo.toLocaleString('ko-KR')}원`, cx0, cy0 + ch + 24);
    const hiText = `기간 최고 ${hi.toLocaleString('ko-KR')}원`;
    ctx.fillText(hiText, cx0 + cw - ctx.measureText(hiText).width, cy0 + ch + 24);
  }

  // 전환 횟수 (성과가 아닌 행동 요약)
  ctx.fillStyle = '#191F28';
  ctx.font = font(36, 600);
  ctx.fillText(`이 구간에서 ${input.conversions.length}번 바꿨다`, pad, 1105);

  // 푸터
  ctx.fillStyle = '#8B95A1';
  ctx.font = font(24);
  ctx.fillText(input.sourceLine, pad, 1200);
  ctx.fillStyle = '#3182F6';
  ctx.font = font(28, 600);
  ctx.fillText(input.appName, pad, 1245);

  return cv.toDataURL('image/png').split(',')[1] ?? null;
}
