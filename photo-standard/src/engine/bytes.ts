/**
 * dataUri 바이트 계산 — docs/FUNCTIONAL_SPEC.md §1-4
 *
 * 문자열 길이를 그대로 쓰면 약 33% 과대평가된다. base64 는 3바이트를 4글자로 늘리기
 * 때문이다. 용량 판정이 통째로 틀리므로 반드시 이 함수를 쓴다.
 */

export function dataUriBytes(uri: string): number {
  const comma = uri.indexOf(',');
  const payload = comma >= 0 ? uri.slice(comma + 1) : uri;
  if (payload.length === 0) return 0;
  const pad = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - pad;
}

/** dataUri 헤더에서 mime 을 읽는다. 없으면 빈 문자열 */
export function dataUriMime(uri: string): string {
  const m = /^data:([^;,]+)/.exec(uri);
  return m?.[1] ?? '';
}

/** 사람이 읽는 용량 표기. 1024 가 아니라 1000 단위 — 기관 표기와 맞춘다 */
export function formatBytes(n: number): string {
  if (n < 1000) return `${n}B`;
  if (n < 1000 * 1000) return `${Math.round(n / 1000)}KB`;
  return `${(n / (1000 * 1000)).toFixed(1)}MB`;
}
