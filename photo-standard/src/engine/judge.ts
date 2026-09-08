/**
 * 판정 엔진 — docs/FUNCTIONAL_SPEC.md §3-3
 *
 * 이 앱의 차별점이다. 흔한 리사이즈 앱은 "크기 조절"만 하고 통과 여부를 말해 주지 않는다.
 *
 * 가장 중요한 규칙: **원본이 목표보다 작으면 blocked 다.**
 * 늘려서 맞춰 주는 게 친절해 보이지만 저해상도는 기관 반려 사유다. 늘려 주면
 * 반려당할 파일을 쥐여 주는 셈이 된다.
 */
import { RATIO_TOL } from '@/constants';
import type { CheckStatus, Overall, Preset, SourceImage, Verdict } from '@/types';

/** range 가 있으면 그 안, 없으면 target 과 정확히 일치 */
function checkSize(actual: number, target: number, min?: number, max?: number): CheckStatus {
  if (min !== undefined && max !== undefined) {
    if (actual < min) return 'under';
    if (actual > max) return 'over';
    return 'ok';
  }
  if (actual < target) return 'under';
  if (actual > target) return 'over';
  return 'ok';
}

export function judge(src: SourceImage, preset: Preset): Verdict {
  const { target, range, maxBytes, format } = preset;

  const width = checkSize(src.width, target.w, range?.wMin, range?.wMax);
  const height = checkSize(src.height, target.h, range?.hMin, range?.hMax);

  const bytes: CheckStatus =
    maxBytes === undefined ? 'ok' : src.bytes <= maxBytes ? 'ok' : 'over';

  const targetRatio = target.w / target.h;
  const srcRatio = src.width / src.height;
  const ratio: CheckStatus =
    Math.abs(srcRatio - targetRatio) / targetRatio <= RATIO_TOL ? 'ok' : 'mismatch';

  // 형식 불일치는 인코딩으로 해결된다. blocked 사유가 아니다.
  const formatStatus: CheckStatus =
    format === 'any' ? 'ok' : src.mime === `image/${format}` ? 'ok' : 'mismatch';

  // 목표보다 작으면 확대해야 한다 → 막는다.
  // range 가 있는 프리셋은 range 하한이 아니라 target 을 기준으로 본다.
  // 결과물을 항상 target 으로 내기 때문이다(§3-5).
  const tooSmall = src.width < target.w || src.height < target.h;

  let overall: Overall;
  let blockedReason: Verdict['blockedReason'];
  if (tooSmall) {
    overall = 'blocked';
    blockedReason = 'too-small';
  } else if (
    width === 'ok' &&
    height === 'ok' &&
    bytes === 'ok' &&
    ratio === 'ok' &&
    formatStatus === 'ok'
  ) {
    overall = 'pass';
  } else {
    overall = 'fixable';
  }

  return {
    width,
    height,
    bytes,
    ratio,
    format: formatStatus,
    overall,
    ...(blockedReason ? { blockedReason } : {}),
  };
}
