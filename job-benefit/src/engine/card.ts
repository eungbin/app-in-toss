/**
 * 공유 카드 이미지 — 4:5 캔버스. 서버가 없어 기기에서 그려 저장·공유한다.
 *
 * 금액 숨김이 기본이다. 남에게 보내는 카드에 내 임금이 들어가지 않게 한다.
 * 숨김일 때는 **일수와 판정만** 그린다 — 총액을 남기면 일수로 나눠 일액이 드러난다.
 */
export const CARD_W = 1080;
export const CARD_H = 1350;

const BG = '#ffffff';
const TEXT = '#191f28';
const SUB = '#6b7684';
const PRIMARY = '#3182f6';
const WARN = '#9a5b00';
const GRAY_700 = '#4e5968';
const SURFACE = '#f2f4f6';

export interface CardArgs {
  verdictLabel: string;
  verdict: 'likely' | 'check' | 'unlikely';
  days: number;
  daily: number;
  total: number;
  hideMoney: boolean;
  basis: string;
  disclaimer: string;
  appLabel: string;
}

const won = (n: number): string => `${n.toLocaleString('ko-KR')}원`;

const verdictColor = (v: CardArgs['verdict']): string =>
  v === 'likely' ? PRIMARY : v === 'check' ? WARN : GRAY_700;

export function drawCard(ctx: CanvasRenderingContext2D, a: CardArgs): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = verdictColor(a.verdict);
  ctx.fillRect(0, 0, CARD_W, 16);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // 판정 배지
  const badge = a.verdictLabel;
  ctx.font = '600 38px system-ui, sans-serif';
  const bw = ctx.measureText(badge).width + 56;
  ctx.fillStyle = SURFACE;
  ctx.beginPath();
  ctx.roundRect(80, 150, bw, 76, 38);
  ctx.fill();
  ctx.fillStyle = verdictColor(a.verdict);
  ctx.fillText(badge, 108, 200);

  // 일수 — 카드에서 가장 큰 글자
  ctx.fillStyle = TEXT;
  ctx.font = '700 220px system-ui, sans-serif';
  const days = String(a.days);
  ctx.fillText(days, 80, 470);
  const dw = ctx.measureText(days).width;
  ctx.font = '600 84px system-ui, sans-serif';
  ctx.fillText('일', 80 + dw + 16, 470);

  ctx.fillStyle = SUB;
  ctx.font = '44px system-ui, sans-serif';
  ctx.fillText('받을 수 있는 날수', 80, 550);

  if (a.hideMoney) {
    ctx.fillStyle = SUB;
    ctx.font = '48px system-ui, sans-serif';
    ctx.fillText('하루 금액은 숨겼어요', 80, 700);
  } else {
    ctx.fillStyle = TEXT;
    ctx.font = '700 76px system-ui, sans-serif';
    ctx.fillText(`하루 ${won(a.daily)}`, 80, 700);
    ctx.fillStyle = SUB;
    ctx.font = '52px system-ui, sans-serif';
    ctx.fillText(`모두 받으면 ${won(a.total)}`, 80, 780);
  }

  ctx.fillStyle = SUB;
  ctx.font = '32px system-ui, sans-serif';
  ctx.fillText(a.basis, 80, CARD_H - 210);
  ctx.fillText(a.disclaimer, 80, CARD_H - 160);
  ctx.fillStyle = TEXT;
  ctx.font = '600 36px system-ui, sans-serif';
  ctx.fillText(a.appLabel, 80, CARD_H - 90);
}

/** 헤더 없는 순수 base64 — kit 의 saveCardImage 가 그 형태를 받는다 */
export function toBase64Png(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png').split(',')[1] ?? '';
}
