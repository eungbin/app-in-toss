/**
 * 협상 카드 이미지 — 4:5 캔버스. 서버가 없으므로 기기에서 그려 저장·공유한다.
 * 문구는 cardText.ts(순수 함수)에서 만들고 여기서는 그리기만 한다.
 */
import { cardLines, type CardArgs, type TimelineCardArgs } from './cardText';
import { num } from './format';
import { t } from '@/i18n';

export const CARD_W = 1080;
export const CARD_H = 1350;

const BG = '#ffffff';
const TEXT = '#191f28';
const SUB = '#6b7684';
const PRIMARY = '#3182f6';
const SURFACE = '#f2f4f6';

function base(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = PRIMARY;
  ctx.fillRect(0, 0, CARD_W, 16);
}

function footer(ctx: CanvasRenderingContext2D): void {
  ctx.textAlign = 'left';
  ctx.fillStyle = SUB;
  ctx.font = '32px system-ui, sans-serif';
  ctx.fillText(t('card.disclaimer'), 80, CARD_H - 150);
  ctx.fillStyle = TEXT;
  ctx.font = '600 36px system-ui, sans-serif';
  ctx.fillText(t('card.footer'), 80, CARD_H - 90);
}

/** 기본 카드(실수령 → 연봉) */
export function drawCard(ctx: CanvasRenderingContext2D, a: CardArgs): void {
  base(ctx);
  const lines = cardLines(a);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  ctx.font = '700 88px system-ui, sans-serif';
  ctx.fillText(lines[0] ?? '', 80, 420);
  ctx.font = '400 52px system-ui, sans-serif';
  ctx.fillStyle = SUB;
  lines.slice(1).forEach((line, i) => ctx.fillText(line, 80, 540 + i * 76));
  footer(ctx);
}

/** 시간축 카드 — 연도별 월 실수령 막대 */
export function drawTimelineCard(ctx: CanvasRenderingContext2D, a: TimelineCardArgs): void {
  base(ctx);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  ctx.font = '700 60px system-ui, sans-serif';
  // 헤드라인을 두 줄로 나눈다
  const words = a.headline.split(' ');
  const half = Math.ceil(words.length / 2);
  ctx.fillText(words.slice(0, half).join(' '), 80, 260);
  ctx.fillText(words.slice(half).join(' '), 80, 340);

  const rows = a.rows;
  if (rows.length > 0) {
    const values = rows.map((r) => r.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const bottom = Math.max(0, min - (max - min) * 1.2 - 1);
    const span = Math.max(1, max - bottom);
    const chartTop = 520;
    const chartH = 480;
    const slot = (CARD_W - 160) / rows.length;
    const barW = Math.min(90, slot * 0.55);

    rows.forEach((r, i) => {
      const h = ((r.value - bottom) / span) * chartH;
      const x = 80 + i * slot + (slot - barW) / 2;
      const y = chartTop + chartH - h;
      ctx.fillStyle = SURFACE;
      ctx.fillRect(x, chartTop, barW, chartH);
      ctx.fillStyle = PRIMARY;
      ctx.fillRect(x, y, barW, Math.max(4, h));
      ctx.fillStyle = SUB;
      ctx.font = '30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(r.label, x + barW / 2, chartTop + chartH + 46);
      ctx.fillStyle = TEXT;
      ctx.font = '600 28px system-ui, sans-serif';
      ctx.fillText(num(Math.round(r.value / 1000)), x + barW / 2, y - 14);
    });
  }
  footer(ctx);
}

/** 캔버스를 base64 PNG(헤더 제외)로 */
export function toBase64Png(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}
