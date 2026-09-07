/**
 * 로고·카드 이미지용 최소 PNG 렌더러. 외부 의존성 없이 Node zlib로 인코딩한다.
 * 앱은 픽셀 함수만 정의한다.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type RGB = [number, number, number];

/** 두 색을 t(0~1)로 섞는다 */
export function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** 슈퍼샘플링 렌더. pixel(x, y)는 부동소수 좌표의 색을 돌려준다 */
export function renderSupersampled(size: number, ss: number, pixel: (x: number, y: number) => RGB): Buffer {
  const px = Buffer.alloc(size * size * 3);
  const step = 1 / ss;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = pixel(x + (sx + 0.5) * step, y + (sy + 0.5) * step);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = ss * ss;
      const i = (y * size + x) * 3;
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
    }
  }
  return px;
}

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

/** RGB 버퍼(size×size×3)를 PNG로 인코딩 */
export function encodePng(rgb: Buffer, size: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const dst = y * (size * 3 + 1);
    raw[dst] = 0; // filter: none
    rgb.copy(raw, dst + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 픽셀 함수로 정사각 PNG를 만들어 저장한다. 파일 크기(bytes)를 반환 */
export function writeSquarePng(path: string, size: number, ss: number, pixel: (x: number, y: number) => RGB): number {
  mkdirSync(dirname(path), { recursive: true });
  const png = encodePng(renderSupersampled(size, ss, pixel), size);
  writeFileSync(path, png);
  return png.length;
}
