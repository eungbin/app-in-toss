/**
 * 앱 로고 생성 — 콘솔 등록용 600×600 PNG (정사각형, 둥근 모서리 없음).
 *   npx tsx scripts/gen-logo.ts
 *
 * 가로 막대 하나와 그 끝의 마감선. 이 앱의 답은 금액이 아니라 **받는 날수**라서
 * (docs/FUNCTIONAL_SPEC.md 0-3) 기간과 그 끝을 그렸다.
 *
 * 처음에는 3칸 막대로 그렸는데 칸이 정사각형에 가까워 **점 세 개(●●●)처럼** 읽혔다.
 * 로딩 표시나 오류로 보이는 모양이라 버렸다 — 잠금 표시에서 점을 쓰지 않는 것과 같은 이유다.
 *
 * 다른 앱과 겹치지 않게 골랐다 — net-pay 는 원화 기호, rent-calc 는 체크 표시,
 * photo-standard 는 크롭 브래킷이다. 앱 아이콘 크기(60px 안팎)로 줄어도 뭉치지 않도록
 * 요소를 막대 하나로 제한하고 칸 사이를 넉넉히 벌렸다.
 * 렌더·인코딩은 @ait/kit scripts/png 에 있다.
 */
import { resolve } from 'node:path';
import { writeSquarePng, type RGB } from '@ait/kit/scripts/png';

const SIZE = 600;
const SS = 3; // 슈퍼샘플링 배율

const BG: RGB = [0x31, 0x82, 0xf6];
const WHITE: RGB = [255, 255, 255];

type Pt = [number, number];

/** 수급 기간 — 가로로 길게. 길쭉해야 점이 아니라 기간으로 읽힌다 */
const BAR: [Pt, Pt] = [
  [156, 300],
  [380, 300],
];
const BAR_THICK = 92;

/** 기간의 끝 — 세로 마감선. 막대와 합친 도형의 가운데가 캔버스 가운데(300)에 오게 맞췄다 */
const STOP: [Pt, Pt] = [
  [462, 204],
  [462, 396],
];
const STOP_THICK = 56;

/** 점이 선분에서 반지름 r 안에 있는가 (둥근 끝) */
function nearSegment(px: number, py: number, [a, b]: [Pt, Pt], r: number): boolean {
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= r;
}

function pixel(x: number, y: number): RGB {
  if (nearSegment(x, y, BAR, BAR_THICK / 2)) return WHITE;
  if (nearSegment(x, y, STOP, STOP_THICK / 2)) return WHITE;
  return BG;
}

const out = resolve(import.meta.dirname, '../assets/logo.png');
const bytes = writeSquarePng(out, SIZE, SS, pixel);
console.log(`assets/logo.png — ${SIZE}×${SIZE}, ${(bytes / 1024).toFixed(1)}KB`);
