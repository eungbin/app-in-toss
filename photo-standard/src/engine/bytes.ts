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

/**
 * base64 페이로드 앞머리로 형식을 알아낸다.
 *
 * 앱인토스 SDK 의 `ImageResponse.dataUri` 는 이름과 달리 **데이터 URI 가 아니라 순수
 * base64 페이로드**다(안드로이드 실기기 2026-09-09 확인 — `/9j/4AAQSkZJ…`).
 * 그대로 `img.src` 에 넣으면 상대 경로로 해석돼 로드에 실패한다.
 */
export function sniffMime(base64: string): string {
  const head = base64.slice(0, 12);
  if (head.startsWith('/9j/')) return 'image/jpeg';
  if (head.startsWith('iVBORw0KGgo')) return 'image/png';
  if (head.startsWith('R0lGOD')) return 'image/gif';
  if (head.startsWith('UklGR')) return 'image/webp';
  if (head.startsWith('Qk')) return 'image/bmp';
  return '';
}

/**
 * 무엇이 오든 브라우저가 읽을 수 있는 데이터 URI 로 만든다.
 * 이미 `data:` 로 시작하면 그대로 둔다.
 */
export function toDataUri(raw: string): string {
  if (raw.startsWith('data:')) return raw;
  const mime = sniffMime(raw);
  // 형식을 못 알아봐도 JPEG 로 시도한다 — 카메라·앨범 결과의 대부분이 JPEG 다
  return `data:${mime || 'image/jpeg'};base64,${raw}`;
}

/** 사람이 읽는 용량 표기. 1024 가 아니라 1000 단위 — 기관 표기와 맞춘다 */
export function formatBytes(n: number): string {
  if (n < 1000) return `${n}B`;
  if (n < 1000 * 1000) return `${Math.round(n / 1000)}KB`;
  return `${(n / (1000 * 1000)).toFixed(1)}MB`;
}
