/**
 * Canvas 처리 계층 — docs/FUNCTIONAL_SPEC.md §3-5, §3-6, §3-7
 *
 * 순수 함수(judge·crop·bisectQuality)는 여기에 의존하지 않는다. 이 파일이 그 반대편,
 * 브라우저 API 를 만지는 유일한 곳이다.
 *
 * 메모리 주의: 고해상도 이미지를 Canvas 로 다루면 크게 쓴다. 중간 캔버스를 재사용하고
 * 처리 후 참조를 끊는다(docs/PRD.md 7장).
 */
import { Q_FIXED } from '@/constants';
import { bisectQuality, type Encoded } from './compress';
import { dataUriBytes } from './bytes';
import type { CropBox, OutputImage, Preset } from '@/types';

export function loadImage(dataUri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode-failed'));
    img.src = dataUri;
  });
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * 크롭과 리사이즈를 한 번에.
 *
 * 축소 배율이 크면 단계적으로 줄인다. 한 번에 크게 줄이면 브라우저가 최근접 이웃에
 * 가깝게 처리해 계단 현상이 생긴다. 절반씩 줄이다 마지막에 목표 크기로 맞춘다.
 */
export function drawResized(
  img: HTMLImageElement,
  crop: CropBox,
  w: number,
  h: number,
): HTMLCanvasElement {
  let srcCanvas: HTMLCanvasElement | null = null;
  let sx = crop.x;
  let sy = crop.y;
  let sw = crop.w;
  let sh = crop.h;

  // 목표의 2배보다 크면 절반씩 줄여 내려온다
  while (sw > w * 2 && sh > h * 2) {
    const nw = Math.max(w, Math.round(sw / 2));
    const nh = Math.max(h, Math.round(sh / 2));
    const step = makeCanvas(nw, nh);
    const sctx = step.getContext('2d');
    if (!sctx) break;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(srcCanvas ?? img, sx, sy, sw, sh, 0, 0, nw, nh);
    srcCanvas = step;
    sx = 0;
    sy = 0;
    sw = nw;
    sh = nh;
  }

  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // JPEG 는 알파가 없다. 투명 영역이 검게 나오지 않도록 흰색을 깔아 둔다.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(srcCanvas ?? img, sx, sy, sw, sh, 0, 0, w, h);
  }
  return out;
}

/** 캔버스를 프리셋 형식으로 인코딩한다. maxBytes 가 있으면 이분 탐색으로 맞춘다. */
export function encodeForPreset(canvas: HTMLCanvasElement, preset: Preset): OutputImage {
  const mime = preset.format === 'png' ? 'image/png' : 'image/jpeg';

  if (preset.format === 'png') {
    const uri = canvas.toDataURL('image/png');
    return {
      dataUri: uri,
      width: canvas.width,
      height: canvas.height,
      bytes: dataUriBytes(uri),
      mime: 'image/png',
      quality: null,
      overLimit: false,
    };
  }

  if (preset.maxBytes === undefined) {
    const uri = canvas.toDataURL(mime, Q_FIXED);
    return {
      dataUri: uri,
      width: canvas.width,
      height: canvas.height,
      bytes: dataUriBytes(uri),
      mime,
      quality: Q_FIXED,
      overLimit: false,
    };
  }

  const encode = (q: number): Encoded => {
    const uri = canvas.toDataURL(mime, q);
    return { dataUri: uri, bytes: dataUriBytes(uri), quality: q };
  };

  const best = bisectQuality(encode, preset.maxBytes);
  // 실패해도 결과를 내되 넘쳤다는 사실을 숨기지 않는다(CV-4)
  const fallback = best ?? encode(0.4);
  return {
    dataUri: fallback.dataUri,
    width: canvas.width,
    height: canvas.height,
    bytes: fallback.bytes,
    mime,
    quality: fallback.quality,
    overLimit: best === null,
  };
}

/** 소스 → 크롭 → 리사이즈 → 인코딩. 한 번의 사용자 동작에서 통째로 돈다(§3-7). */
export async function convert(
  dataUri: string,
  crop: CropBox,
  preset: Preset,
  target: { w: number; h: number },
): Promise<OutputImage> {
  const img = await loadImage(dataUri);
  const canvas = drawResized(img, crop, target.w, target.h);
  const out = encodeForPreset(canvas, preset);
  // 참조를 끊는다 — 저사양 기기에서 캔버스가 쌓이면 탭이 죽는다
  canvas.width = 0;
  canvas.height = 0;
  img.src = '';
  return out;
}
