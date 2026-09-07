/**
 * 앱 로고 생성 — 콘솔 등록용 600×600 PNG (정사각형, 둥근 모서리 없음).
 *   npx tsx scripts/gen-logo.ts
 * 외부 의존성 없이 Node zlib로 PNG를 직접 인코딩한다. 3배 슈퍼샘플링으로 계단현상을 줄인다.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SIZE = 600;
const SS = 3; // 슈퍼샘플링 배율

type RGB = [number, number, number];
const BG: RGB = [0x31, 0x82, 0xf6];
const WHITE: RGB = [255, 255, 255];

interface Candle {
  cx: number;
  bodyTop: number;
  bodyBottom: number;
  wickTop: number;
  wickBottom: number;
  strong: boolean;
}

const CANDLES: Candle[] = [
  { cx: 204, bodyTop: 325, bodyBottom: 384, wickTop: 302, wickBottom: 405, strong: false },
  { cx: 268, bodyTop: 346, bodyBottom: 389, wickTop: 327, wickBottom: 408, strong: false },
  { cx: 332, bodyTop: 271, bodyBottom: 382, wickTop: 250, wickBottom: 398, strong: false },
  { cx: 396, bodyTop: 228, bodyBottom: 290, wickTop: 207, wickBottom: 306, strong: true },
];
const BODY_W = 45;
const WICK_W = 11;

const RING_CX = 300;
const RING_CY = 300;
const RING_R = 214;
const RING_W = 21;
/**
 * 되감기 호. 화면 좌표(y가 아래로 증가)에서 0=오른쪽, π/2=아래.
 * 오른쪽 위를 비워 두고 나머지를 감싼다. FROM > TO 이면 0을 넘어 이어진다.
 */
const RING_FROM = Math.PI * 1.90; // 342°
const RING_TO = Math.PI * 1.56; // 281°

/** 화살촉 — 호가 끝나는 281° 지점(위쪽)에서 되감기 방향을 가리킨다 */
const HEAD: Array<[number, number]> = [
  [RING_CX + 6, RING_CY - 214],
  [RING_CX + 74, RING_CY - 176],
  [RING_CX + 16, RING_CY - 148],
];

function inRect(x: number, y: number, cx: number, w: number, top: number, bottom: number): boolean {
  return x >= cx - w / 2 && x <= cx + w / 2 && y >= top && y <= bottom;
}

function inTriangle(px: number, py: number, tri: Array<[number, number]>): boolean {
  const [a, b, c] = tri as [[number, number], [number, number], [number, number]];
  const sign = (p: [number, number], q: [number, number], r: [number, number]) =>
    (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const d1 = sign([px, py], a, b);
  const d2 = sign([px, py], b, c);
  const d3 = sign([px, py], c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

function inRing(x: number, y: number): boolean {
  const dx = x - RING_CX;
  const dy = y - RING_CY;
  const dist = Math.hypot(dx, dy);
  if (Math.abs(dist - RING_R) > RING_W / 2) return false;
  let ang = Math.atan2(dy, dx);
  if (ang < 0) ang += Math.PI * 2;
  // FROM > TO 이면 0(=2π)을 넘어 이어지는 구간
  return RING_FROM <= RING_TO
    ? ang >= RING_FROM && ang <= RING_TO
    : ang >= RING_FROM || ang <= RING_TO;
}

/** 좌표 하나의 색. null이면 배경 */
function sample(x: number, y: number): RGB | null {
  if (inRing(x, y) || inTriangle(x, y, HEAD)) return WHITE;
  for (const k of CANDLES) {
    if (
      inRect(x, y, k.cx, BODY_W, k.bodyTop, k.bodyBottom) ||
      inRect(x, y, k.cx, WICK_W, k.wickTop, k.wickBottom)
    ) {
      return k.strong ? WHITE : null;
    }
  }
  return null;
}

/** 약한 캔들은 배경 위에 반투명 흰색으로 얹는다 */
function isDimCandle(x: number, y: number): boolean {
  for (const k of CANDLES) {
    if (k.strong) continue;
    if (
      inRect(x, y, k.cx, BODY_W, k.bodyTop, k.bodyBottom) ||
      inRect(x, y, k.cx, WICK_W, k.wickTop, k.wickBottom)
    ) {
      return true;
    }
  }
  return false;
}

function render(): Buffer {
  const px = Buffer.alloc(SIZE * SIZE * 3);
  const step = 1 / SS;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) * step;
          const fy = y + (sy + 0.5) * step;
          const solid = sample(fx, fy);
          let c: RGB;
          if (solid) {
            c = solid;
          } else if (isDimCandle(fx, fy)) {
            // 배경 위 55% 흰색
            c = [
              Math.round(BG[0] + (255 - BG[0]) * 0.55),
              Math.round(BG[1] + (255 - BG[1]) * 0.55),
              Math.round(BG[2] + (255 - BG[2]) * 0.55),
            ];
          } else {
            c = BG;
          }
          r += c[0];
          g += c[1];
          b += c[2];
          n++;
        }
      }
      const i = (y * SIZE + x) * 3;
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
    }
  }
  return px;
}

/* ── 최소 PNG 인코더 ─────────────────────────────────────────── */

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgb: Buffer, size: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  // 10,11,12 = 0 (deflate / adaptive filter / no interlace)

  // 각 행 앞에 필터 바이트 0
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const dst = y * (size * 3 + 1);
    raw[dst] = 0;
    rgb.copy(raw, dst + 1, y * size * 3, (y + 1) * size * 3);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = resolve(import.meta.dirname, '../assets');
mkdirSync(out, { recursive: true });
const png = encodePng(render(), SIZE);
writeFileSync(resolve(out, 'logo-600.png'), png);
console.log(`assets/logo-600.png — ${SIZE}×${SIZE}, ${(png.length / 1024).toFixed(1)}KB`);
