/** 금액 계산 헬퍼 — 모든 결과는 정수 원 단위 */

/** n 미만 절사 */
export function truncTo(value: number, unit: number): number {
  return Math.floor(value / unit) * unit;
}

/** 10원 미만 절사 */
export function floor10(value: number): number {
  return truncTo(value, 10);
}

/** 1원 미만 절사 */
export function floor1(value: number): number {
  return Math.floor(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 만 원 단위 올림 */
export function ceilTo10k(value: number): number {
  return Math.ceil(value / 10_000) * 10_000;
}
