/**
 * 앱 로고 생성 — 콘솔 등록용 600×600 PNG (정사각형, 둥근 모서리 없음).
 *   npx tsx scripts/gen-logo.ts
 *
 * 체크 표시 + 아래 선 하나. "이거 맞아?"에 답하는 앱이라 체크가 판정을 상징하고,
 * 선은 계약서를 암시한다. 체크만 두면 할 일 앱처럼 보여 선을 더했다.
 * 앱 아이콘 크기(60px 안팎)로 줄어도 뭉치지 않게 요소는 둘로 제한했다.
 * 렌더·인코딩은 @ait/kit scripts/png 에 있다.
 */
import { resolve } from 'node:path';
import { writeSquarePng, type RGB } from '@ait/kit/scripts/png';

const SIZE = 600;
const SS = 3; // 슈퍼샘플링 배율

const BG: RGB = [0x31, 0x82, 0xf6];
const WHITE: RGB = [255, 255, 255];

type Pt = [number, number];

/** 체크 표시의 두 획 */
const CHECK: Pt[] = [
  [150, 282],
  [256, 388],
  [452, 172],
];
const STROKE = 72;

/** 계약서를 암시하는 밑줄. 체크와 겹치지 않게 아래에 두고 끝을 둥글게 한다 */
const RULE: [Pt, Pt] = [
  [176, 474],
  [424, 474],
];
const RULE_STROKE = 46;

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

function pixel(x: number, y: number): RGB {
  for (let i = 0; i + 1 < CHECK.length; i++) {
    if (nearSegment(x, y, CHECK[i] as Pt, CHECK[i + 1] as Pt, STROKE / 2)) return WHITE;
  }
  if (nearSegment(x, y, RULE[0], RULE[1], RULE_STROKE / 2)) return WHITE;
  return BG;
}

const out = resolve(import.meta.dirname, '../assets/logo-600.png');
const bytes = writeSquarePng(out, SIZE, SS, pixel);
console.log(`assets/logo-600.png — ${SIZE}×${SIZE}, ${(bytes / 1024).toFixed(1)}KB`);
