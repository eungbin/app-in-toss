/**
 * 금액 헬퍼 — 모든 결과는 정수 원.
 *
 * 전환·상한 금액은 **반올림**한다. 한국부동산원·렌트홈 공공 계산기가 둘 다
 * 반올림하고(각각 toFixed / Math.round), 사용자가 그 값과 1원이 달라지면
 * 오류로 받아들일 위험이 더 크다. 근거는 docs/FACT_CHECK.md 5장.
 */

/** 원 미만 반올림 */
export function roundWon(value: number): number {
  return Math.round(value);
}

/** 원 미만 절사 — 상한 금액에서 안전한 쪽(중개보수) */
export function floorWon(value: number): number {
  return Math.floor(value);
}

/** 만 원 단위 반올림 — 표시용 */
export function toManwon(value: number): number {
  return Math.round(value / 10_000);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
