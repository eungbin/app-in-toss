/** T2·T3 — docs/FUNCTIONAL_SPEC.md §5 */
import { describe, expect, it } from 'vitest';
import { judge } from '../judge';
import { findPreset } from '@/data/presets';
import type { SourceImage } from '@/types';

const img = (w: number, h: number, bytes = 100_000, mime = 'image/jpeg'): SourceImage => ({
  dataUri: 'data:image/jpeg;base64,AAAA',
  width: w,
  height: h,
  bytes,
  mime,
});

const passport = findPreset('passport-online');
const visa = findPreset('us-visa');
const idPhoto = findPreset('id-3x4');

describe('여권 온라인 — 권장값 그대로', () => {
  it('413 × 531, 400KB, jpeg 는 전부 통과', () => {
    const v = judge(img(413, 531, 400_000), passport);
    expect(v.overall).toBe('pass');
    expect(v).toMatchObject({ width: 'ok', height: 'ok', bytes: 'ok', ratio: 'ok', format: 'ok' });
  });
});

describe('허용 범위', () => {
  it('범위 안(431 × 550)이면 크기는 ok — 비율은 어긋난다', () => {
    const v = judge(img(431, 550), passport);
    expect(v.width).toBe('ok');
    expect(v.height).toBe('ok');
  });
  it('범위를 넘으면 over', () => {
    expect(judge(img(432, 531), passport).width).toBe('over');
    expect(judge(img(413, 551), passport).height).toBe('over');
  });
});

describe('용량', () => {
  it('500KB 이하면 ok', () => {
    expect(judge(img(413, 531, 500_000), passport).bytes).toBe('ok');
  });
  it('넘으면 over 이고 fixable 이다 — 압축으로 해결된다', () => {
    const v = judge(img(413, 531, 1_800_000), passport);
    expect(v.bytes).toBe('over');
    expect(v.overall).toBe('fixable');
  });
  it('maxBytes 가 없는 프리셋은 항상 ok', () => {
    expect(judge(img(354, 472, 99_000_000), idPhoto).bytes).toBe('ok');
  });
});

describe('비율', () => {
  it('1% 오차 안이면 ok', () => {
    // 413/531 = 0.77778. 826 × 1062 는 같은 비율
    expect(judge(img(826, 1062), passport).ratio).toBe('ok');
  });
  it('3:4 는 여권 비율과 다르다', () => {
    const v = judge(img(1200, 1600), passport);
    expect(v.ratio).toBe('mismatch');
    expect(v.overall).toBe('fixable');
  });
  it('정사각 프리셋은 정사각만 ok', () => {
    expect(judge(img(800, 800), visa).ratio).toBe('ok');
    expect(judge(img(800, 1000), visa).ratio).toBe('mismatch');
  });
});

describe('형식', () => {
  it('jpeg 를 요구하는데 png 면 mismatch — 그래도 fixable 이다', () => {
    const v = judge(img(413, 531, 100_000, 'image/png'), passport);
    expect(v.format).toBe('mismatch');
    expect(v.overall).toBe('fixable');
  });
  it("format 이 'any' 면 무엇이든 ok", () => {
    expect(judge(img(354, 472, 1000, 'image/heic'), idPhoto).format).toBe('ok');
  });
});

describe('T3 — 목표보다 작으면 막는다', () => {
  it('가로가 모자라면 blocked', () => {
    const v = judge(img(320, 600), passport);
    expect(v.overall).toBe('blocked');
    expect(v.blockedReason).toBe('too-small');
  });
  it('세로가 모자라면 blocked', () => {
    expect(judge(img(500, 400), passport).overall).toBe('blocked');
  });
  it('한 픽셀만 모자라도 blocked — 확대는 하지 않는다', () => {
    expect(judge(img(412, 531), passport).overall).toBe('blocked');
    expect(judge(img(413, 530), passport).overall).toBe('blocked');
  });
  it('딱 맞으면 blocked 가 아니다', () => {
    expect(judge(img(413, 531, 400_000), passport).overall).toBe('pass');
  });
  it('용량이 넘쳐도 크기가 작으면 blocked 가 우선이다', () => {
    // 압축해 봐야 해상도가 모자란 건 해결되지 않는다
    expect(judge(img(200, 260, 9_000_000), passport).overall).toBe('blocked');
  });
});
