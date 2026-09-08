/**
 * 협상 카드 이미지 — 4:5 캔버스. 서버가 없으므로 기기에서 그려 저장·공유한다.
 * 문구는 cardText.ts(순수 함수)에서 만들고 여기서는 그리기만 한다.
 */
import { cardLines, type CardArgs, type TimelineCardArgs } from './cardText';
import { num, pct } from './format';
import { t } from '@/i18n';

export const CARD_W = 1080;
export const CARD_H = 1350;

const BG = '#ffffff';
const TEXT = '#191f28';
const SUB = '#6b7684';
const PRIMARY = '#3182f6';
const SURFACE = '#f2f4f6';
const GRAY_300 = '#d1d6db';

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

/**
 * 기본 카드(실수령 → 연봉).
 *
 * 예전에는 헤드라인 뒤 580px 이 비어 있었다(카드 높이의 43%). 실기기 스크린샷에서
 * 가운데가 텅 빈 게 드러났다. 그 자리에 실수령·공제 비율 막대를 넣었다.
 *
 * **연봉 숨김이 켜지면 비율만 그리고 금액은 그리지 않는다.** 세전 월급을 적으면
 * 12를 곱해 숨긴 연봉이 드러난다.
 */
export function drawCard(ctx: CanvasRenderingContext2D, a: CardArgs): void {
  base(ctx);
  const lines = cardLines(a);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  ctx.font = '700 88px system-ui, sans-serif';
  ctx.fillText(lines[0] ?? '', 80, 380);
  ctx.font = '400 52px system-ui, sans-serif';
  ctx.fillStyle = SUB;
  lines.slice(1).forEach((line, i) => ctx.fillText(line, 80, 500 + i * 76));

  drawRatioBar(ctx, a);
  footer(ctx);
}

/** 실수령 대 공제 비율 막대 */
function drawRatioBar(ctx: CanvasRenderingContext2D, a: CardArgs): void {
  const gross = a.netMonthly + a.deductions;
  if (gross <= 0) return;
  const ratio = a.netMonthly / gross;

  const x = 80;
  const w = CARD_W - 160;
  const y = 900;
  const h = 56;
  const gap = 8;
  const netW = Math.round((w - gap) * ratio);

  ctx.fillStyle = PRIMARY;
  ctx.beginPath();
  ctx.roundRect(x, y, netW, h, [28, 6, 6, 28]);
  ctx.fill();
  ctx.fillStyle = GRAY_300;
  ctx.beginPath();
  ctx.roundRect(x + netW + gap, y, w - netW - gap, h, [6, 28, 28, 6]);
  ctx.fill();

  ctx.font = '600 40px system-ui, sans-serif';
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'left';
  ctx.fillText(t('card.bar.net', { p: pct(ratio, 1) }), x, y + h + 68);
  ctx.fillStyle = SUB;
  ctx.textAlign = 'right';
  ctx.fillText(t('card.bar.ded', { p: pct(1 - ratio, 1) }), x + w, y + h + 68);
  ctx.textAlign = 'left';

  // 연봉을 숨겼으면 금액은 적지 않는다 — 세전에서 연봉이 역산된다
  if (!a.hideGross) {
    ctx.font = '400 36px system-ui, sans-serif';
    ctx.fillStyle = SUB;
    ctx.fillText(`${t('result.gross.label')} ${num(gross)}원`, x, y - 32);
  }
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
