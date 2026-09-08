/** 표시 포맷 */

export const won = (n: number): string => n.toLocaleString('ko-KR');

/** 만 원 단위 표시. 소수는 버린다 */
export const manwon = (n: number): string => Math.round(n / 10_000).toLocaleString('ko-KR');

/** 0.0295 → "2.95" */
export const percent = (rate: number, digits = 2): string => (rate * 100).toFixed(digits);

/** 0.05 → "5" (전환율·기준금리 표시용, 불필요한 0 제거) */
export const percentShort = (rate: number): string => {
  const v = rate * 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, '');
};

export const todayIso = (now: Date = new Date()): string => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
