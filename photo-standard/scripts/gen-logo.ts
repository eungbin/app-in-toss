/**
 * 앱 로고 생성 — 콘솔 등록용 600×600 PNG (정사각형, 둥근 모서리 없음).
 *   npx tsx scripts/gen-logo.ts
 *
 * 크롭 브래킷 넷. 규격을 맞추는 앱이라 "프레임을 씌운다"가 가장 직접적인 상징이고,
 * 자르기 화면에서 실제로 보는 모양이기도 하다. 안을 비워 배경색이 사진 자리처럼 남는다.
 *
 * rent-calc 가 체크 표시를 쓰므로 겹치지 않게 골랐다. 앱 아이콘 크기(60px 안팎)로 줄어도
 * 뭉치지 않도록 요소를 브래킷 하나로 제한하고 획을 굵게 잡았다.
 * 브래킷이 그리는 프레임은 여권 규격과 같은 3.5 : 4.5 비율이다.
 */
import { resolve } from 'node:path';
import { writeSquarePng, type RGB } from '@ait/kit/scripts/png';

const SIZE = 600;
const SS = 3; // 슈퍼샘플링 배율

const BG: RGB = [0x31, 0x82, 0xf6];
const WHITE: RGB = [255, 255, 255];

/** 프레임 — 3.5 : 4.5 (여권 규격 비율) */
const FRAME_W = 300;
const FRAME_H = Math.round((FRAME_W * 45) / 35);
const LEFT = (SIZE - FRAME_W) / 2;
const TOP = (SIZE - FRAME_H) / 2;
const RIGHT = LEFT + FRAME_W;
const BOTTOM = TOP + FRAME_H;

const STROKE = 40;
/** 모서리에서 뻗는 길이. 변의 40% 안팎 — 길면 사각형이 되어 브래킷으로 안 읽힌다 */
const ARM_X = 118;
const ARM_Y = 142;

type Seg = [number, number, number, number];

const SEGS: Seg[] = [
  [LEFT, TOP, LEFT + ARM_X, TOP],
  [LEFT, TOP, LEFT, TOP + ARM_Y],
  [RIGHT - ARM_X, TOP, RIGHT, TOP],
  [RIGHT, TOP, RIGHT, TOP + ARM_Y],
  [LEFT, BOTTOM - ARM_Y, LEFT, BOTTOM],
  [LEFT, BOTTOM, LEFT + ARM_X, BOTTOM],
  [RIGHT, BOTTOM - ARM_Y, RIGHT, BOTTOM],
  [RIGHT - ARM_X, BOTTOM, RIGHT, BOTTOM],
];

/** 점이 선분에서 반지름 r 안에 있는가 (끝을 둥글게 처리한다) */
function nearSegment(px: number, py: number, s: Seg, r: number): boolean {
  const [ax, ay, bx, by] = s;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= r;
}

const r = STROKE / 2;
const bytes = writeSquarePng(
  resolve(import.meta.dirname, '../assets/logo-600.png'),
  SIZE,
  SS,
  (x, y) => (SEGS.some((s) => nearSegment(x, y, s, r)) ? WHITE : BG),
);

console.log(`assets/logo-600.png — ${SIZE}×${SIZE}, ${(bytes / 1024).toFixed(1)}KB`);
