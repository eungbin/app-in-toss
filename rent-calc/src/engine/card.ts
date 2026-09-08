/**
 * 판정 카드 이미지 — 4:5 캔버스. 서버가 없으므로 기기에서 그려 저장·공유한다.
 * 문구는 cardText.ts(순수 함수)에서 만들고 여기서는 그리기만 한다.
 */
import { cardLines, timelineCardLines, type CardArgs, type TimelineCardArgs } from './cardText';
import { won } from './format';
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

/** 헤드라인을 폭에 맞춰 두 줄까지 접는다 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur === '' ? w : `${cur} ${w}`;
    if (ctx.measureText(next).width > maxWidth && cur !== '') {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

export function drawCard(ctx: CanvasRenderingContext2D, a: CardArgs): void {
  base(ctx);
  const [head, ...rest] = cardLines(a);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  ctx.font = '700 84px system-ui, sans-serif';
  const headLines = wrap(ctx, head ?? '', CARD_W - 160);
  headLines.forEach((line, i) => ctx.fillText(line, 80, 400 + i * 104));

  const bodyTop = 400 + headLines.length * 104 + 40;
  ctx.font = '400 48px system-ui, sans-serif';
  ctx.fillStyle = SUB;
  rest.forEach((line, i) => ctx.fillText(line, 80, bodyTop + i * 72));
  footer(ctx);
}

/** 시간축 카드 — 연도별 전환 상한 월세 막대 */
export function drawTimelineCard(ctx: CanvasRenderingContext2D, a: TimelineCardArgs): void {
  base(ctx);
  const lines = timelineCardLines(a);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  ctx.font = '700 72px system-ui, sans-serif';
  ctx.fillText(lines[0] ?? '', 80, 300);
  ctx.font = '400 40px system-ui, sans-serif';
  ctx.fillStyle = SUB;
  ctx.fillText(lines[1] ?? '', 80, 370);

  // 막대
  const rows = a.rows;
  const left = 80;
  const right = CARD_W - 80;
  const top = 460;
  const height = 380;
  const max = Math.max(...rows.map((r) => r.maxRent), 1);
  const slot = (right - left) / Math.max(rows.length, 1);
  const barW = Math.min(slot * 0.55, 90);

  rows.forEach((r, i) => {
    const h = Math.max((r.maxRent / max) * height, 4);
    const x = left + slot * i + (slot - barW) / 2;
    const y = top + height - h;
    ctx.fillStyle = i === rows.length - 1 ? PRIMARY : SURFACE;
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = SUB;
    ctx.font = '30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(r.label, x + barW / 2, top + height + 44);
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  ctx.font = '400 44px system-ui, sans-serif';
  wrap(ctx, lines[2] ?? '', CARD_W - 160).forEach((line, i) =>
    ctx.fillText(line, 80, top + height + 130 + i * 60),
  );
  footer(ctx);
}

/** 캔버스를 만들어 base64(PNG, 접두어 없음)로 돌려준다 */
export function renderToBase64(draw: (ctx: CanvasRenderingContext2D) => void): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;
  draw(ctx);
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

/** 접근성·검증용 텍스트 대체 */
export function cardAltText(a: CardArgs): string {
  return `${cardLines(a).join(' ')} (${won(a.proposedRent)}원)`;
}
