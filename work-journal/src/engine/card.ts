/**
 * 공유 카드 (S02) — docs/FUNCTIONAL_SPEC.md §3-12
 * 1080×1350 캔버스에 직접 그린다. 서버가 없어 이미지를 호스팅할 수 없으므로
 * 기기에 저장하거나 딥링크와 텍스트로 공유한다.
 */
import { CARD_H, CARD_W } from '@/constants';

export interface CardArgs {
  /** 1~12 */
  month: number;
  hoursText: string;
  net: number;
  gross: number;
  weeklyCount: number;
  places: number;
  hideMoney: boolean;
}

const PURPLE = '#6b5ce7';
const FONT = "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', Pretendard, system-ui, sans-serif";
const won = (n: number): string => `${n.toLocaleString('ko-KR')}원`;

function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number): void {
  // font 단축 문법에 inherit 를 쓰면 선언 전체가 버려진다(net-pay 6-3). 값을 직접 적는다.
  ctx.font = `${weight} ${size}px ${FONT}`;
}

export function drawCard(ctx: CanvasRenderingContext2D, a: CardArgs): void {
  ctx.fillStyle = PURPLE;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const pad = 96;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // 헤드라인
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  setFont(ctx, 600, 58);
  ctx.fillText(`${a.month}월, ${a.hoursText} 일하고`, pad, 240);

  if (a.hideMoney) {
    ctx.fillStyle = '#ffffff';
    setFont(ctx, 800, 104);
    ctx.fillText(`${a.hoursText} 일했어요`, pad, 400);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    setFont(ctx, 500, 44);
    ctx.fillText(`근무지 ${a.places}곳`, pad, 480);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    setFont(ctx, 600, 46);
    ctx.fillText('예상 실수령', pad, 350);

    ctx.fillStyle = '#ffffff';
    setFont(ctx, 800, 126);
    ctx.fillText(won(a.net), pad, 470);

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    setFont(ctx, 500, 42);
    ctx.fillText(`세전 ${won(a.gross)} · 주휴 ${a.weeklyCount}회 · 근무지 ${a.places}곳`, pad, 552);
  }

  // 하단 — 면책과 앱 이름
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  setFont(ctx, 500, 34);
  ctx.fillText('예상액 · 근로기준법·간이세액표 기준', pad, CARD_H - 190);

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(pad, CARD_H - 150, CARD_W - pad * 2, 2);

  ctx.fillStyle = '#ffffff';
  setFont(ctx, 700, 40);
  ctx.fillText('근무수첩 · 토스에서 열기', pad, CARD_H - 84);
}

/** 캔버스를 헤더 없는 순수 base64 로 — SDK 가 그 형태를 받는다 */
export function toBase64Png(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

export function cardShareText(a: CardArgs): string {
  return a.hideMoney
    ? `${a.month}월에 ${a.hoursText} 일했어요 (근무수첩)`
    : `${a.month}월, ${a.hoursText} 일하고 예상 실수령 ${won(a.net)} (예상액 · 근무수첩)`;
}
