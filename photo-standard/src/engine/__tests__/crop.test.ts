/** T4 — docs/FUNCTIONAL_SPEC.md §5 */
import { describe, expect, it } from 'vitest';
import { clampCrop, initialCrop, minCropSize, scaleCrop } from '../crop';
import type { SourceImage } from '@/types';

const img = (w: number, h: number): SourceImage => ({
  dataUri: '',
  width: w,
  height: h,
  bytes: 0,
  mime: 'image/jpeg',
});

const R_PASSPORT = 413 / 531; // 약 0.7778
const R_SQUARE = 1;

describe('initialCrop', () => {
  it('가로가 긴 소스 — 높이를 꽉 채운다', () => {
    const box = initialCrop(img(2000, 1000), R_PASSPORT);
    expect(box.h).toBe(1000);
    expect(box.w).toBe(Math.round(1000 * R_PASSPORT));
    expect(box.y).toBe(0);
  });

  it('세로가 긴 소스 — 너비를 꽉 채운다', () => {
    const box = initialCrop(img(1000, 3000), R_PASSPORT);
    expect(box.w).toBe(1000);
    expect(box.h).toBe(Math.round(1000 / R_PASSPORT));
    expect(box.x).toBe(0);
  });

  it('정사각 소스에 정사각 목표 — 전체를 쓴다', () => {
    expect(initialCrop(img(800, 800), R_SQUARE)).toEqual({ x: 0, y: 0, w: 800, h: 800 });
  });

  it('중앙 정렬된다', () => {
    const src = img(2000, 1000);
    const box = initialCrop(src, R_PASSPORT);
    expect(box.x).toBe(Math.round((src.width - box.w) / 2));
  });

  it('항상 소스 안에 들어간다', () => {
    for (const [w, h] of [[2000, 1000], [1000, 3000], [800, 800], [413, 531]] as const) {
      const src = img(w, h);
      for (const r of [R_PASSPORT, R_SQUARE, 3 / 4]) {
        const b = initialCrop(src, r);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(src.width);
        expect(b.y + b.h).toBeLessThanOrEqual(src.height);
      }
    }
  });
});

describe('clampCrop', () => {
  const src = img(1000, 1000);
  it('왼쪽·위로 벗어나면 밀어 넣는다', () => {
    expect(clampCrop({ x: -50, y: -30, w: 400, h: 400 }, src)).toMatchObject({ x: 0, y: 0 });
  });
  it('오른쪽·아래로 벗어나면 밀어 넣는다', () => {
    expect(clampCrop({ x: 900, y: 900, w: 400, h: 400 }, src)).toMatchObject({ x: 600, y: 600 });
  });
  it('소스보다 큰 박스는 소스 크기로 줄인다', () => {
    expect(clampCrop({ x: 0, y: 0, w: 2000, h: 2000 }, src)).toEqual({ x: 0, y: 0, w: 1000, h: 1000 });
  });
});

describe('minCropSize — 확대를 막는 하한', () => {
  it('목표 픽셀보다 작아질 수 없다', () => {
    expect(minCropSize({ w: 413, h: 531 }, R_PASSPORT).w).toBe(413);
  });
});

describe('scaleCrop', () => {
  const src = img(2000, 2000);
  const min = minCropSize({ w: 413, h: 531 }, R_PASSPORT);

  it('축소해도 하한 아래로 내려가지 않는다', () => {
    const box = initialCrop(src, R_PASSPORT);
    const shrunk = scaleCrop(box, 0.01, src, min);
    expect(shrunk.w).toBeGreaterThanOrEqual(min.w);
  });

  it('확대해도 소스를 넘지 않는다', () => {
    const box = initialCrop(src, R_PASSPORT);
    const grown = scaleCrop(box, 10, src, min);
    expect(grown.x).toBeGreaterThanOrEqual(0);
    expect(grown.y).toBeGreaterThanOrEqual(0);
    expect(grown.x + grown.w).toBeLessThanOrEqual(src.width);
    expect(grown.y + grown.h).toBeLessThanOrEqual(src.height);
  });

  it('비율을 유지한다', () => {
    const box = initialCrop(src, R_PASSPORT);
    const scaled = scaleCrop(box, 0.5, src, min);
    expect(scaled.w / scaled.h).toBeCloseTo(R_PASSPORT, 2);
  });
});
