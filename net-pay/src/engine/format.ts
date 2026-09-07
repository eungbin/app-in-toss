/** 표시 형식 — 금액은 항상 고정폭으로 렌더한다 */

export function won(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

export function num(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

/** 원 → 만 원 단위 문자열 (버림) */
export function manwon(n: number): string {
  return Math.floor(n / 10_000).toLocaleString('ko-KR');
}

export function pct(rate: number, digits = 3): string {
  return `${(rate * 100).toFixed(digits).replace(/\.?0+$/, '')}%`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
