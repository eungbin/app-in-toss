/**
 * 앱 로고 생성 — 콘솔 등록용 600×600 PNG (정사각형, 둥근 모서리 없음).
 *   npx tsx scripts/gen-logo.ts
 *
 * 원화 기호 하나만 굵게 둔다. 앱 아이콘 크기(60px 안팎)로 줄어들어도 뭉치지 않아야 하므로
 * 요소를 더하지 않았다. 렌더·인코딩은 @ait/kit scripts/png 에 있다.
 */
import { resolve } from 'node:path';
import { writeSquarePng, type RGB } from '@ait/kit/scripts/png';

const SIZE = 600;
const SS = 3; // 슈퍼샘플링 배율

const BG: RGB = [0x31, 0x82, 0xf6];
const WHITE: RGB = [255, 255, 255];

type Pt = [number, number];

/** W 를 이루는 네 획의 꼭짓점 */
const W_PTS: Pt[] = [
  [128, 168],
  [214, 432],
  [300, 168],
  [386, 432],
  [472, 168],
];
const STROKE = 52;

/** ₩ 의 가로 두 줄. W 보다 살짝 넓게 뻗는다 */
const BARS = [
  { x0: 98, x1: 502, y0: 246, y1: 288 },
  { x0: 98, x1: 502, y0: 314, y1: 356 },
];

/** 점 (px,py) 가 선분 a-b 에서 반지름 r 안에 있는가 */
function nearSegment(px: number, py: number, a: Pt, b: Pt, r: number): boolean {
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= r;
}

function inRect(x: number, y: number, r: { x0: number; x1: number; y0: number; y1: number }): boolean {
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

function pixel(x: number, y: number): RGB {
  for (let i = 0; i + 1 < W_PTS.length; i++) {
    if (nearSegment(x, y, W_PTS[i] as Pt, W_PTS[i + 1] as Pt, STROKE / 2)) return WHITE;
  }
  for (const bar of BARS) {
    if (inRect(x, y, bar)) return WHITE;
  }
  return BG;
}

const out = resolve(import.meta.dirname, '../assets/logo-600.png');
const bytes = writeSquarePng(out, SIZE, SS, pixel);
console.log(`assets/logo-600.png — ${SIZE}×${SIZE}, ${(bytes / 1024).toFixed(1)}KB`);
