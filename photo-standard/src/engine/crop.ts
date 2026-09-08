/**
 * 자르기 — docs/FUNCTIONAL_SPEC.md §3-4
 *
 * 비율은 규격이 정하고 사용자가 바꿀 수 없다. 늘리거나 눌러서 맞추면 비율 왜곡이라
 * 반려 사유가 된다(docs/PRD.md 2-3 C3). 그래서 화면에도 모서리 핸들을 두지 않는다.
 */
import type { CropBox, SourceImage } from '@/types';

/** 소스 안에 들어가는 가장 큰 r 비율 사각형을 중앙에 놓는다 */
export function initialCrop(src: SourceImage, r: number): CropBox {
  const srcRatio = src.width / src.height;
  let w: number;
  let h: number;
  if (srcRatio > r) {
    // 소스가 더 넓다 → 높이를 꽉 채우고 가로를 줄인다
    h = src.height;
    w = Math.round(h * r);
  } else {
    w = src.width;
    h = Math.round(w / r);
  }
  return {
    x: Math.round((src.width - w) / 2),
    y: Math.round((src.height - h) / 2),
    w,
    h,
  };
}

/** 박스를 소스 경계 안으로 밀어 넣는다. 크기는 바꾸지 않는다 */
export function clampCrop(box: CropBox, src: SourceImage): CropBox {
  const w = Math.min(box.w, src.width);
  const h = Math.min(box.h, src.height);
  return {
    w,
    h,
    x: Math.min(Math.max(0, box.x), src.width - w),
    y: Math.min(Math.max(0, box.y), src.height - h),
  };
}

/**
 * 축소 하한 — 박스가 목표 픽셀보다 작아지면 결과가 확대된다.
 * 그 지점에서 더 줄지 않게 막는다.
 */
export function minCropSize(target: { w: number; h: number }, r: number): { w: number; h: number } {
  return { w: target.w, h: Math.round(target.w / r) };
}

/** 중심을 유지한 채 배율을 적용하고 경계로 클램프한다 */
export function scaleCrop(
  box: CropBox,
  scale: number,
  src: SourceImage,
  min: { w: number; h: number },
): CropBox {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const r = box.w / box.h;

  let w = Math.round(box.w * scale);
  w = Math.max(min.w, Math.min(w, src.width));
  let h = Math.round(w / r);
  if (h > src.height) {
    h = src.height;
    w = Math.round(h * r);
  }

  return clampCrop({ x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h }, src);
}
