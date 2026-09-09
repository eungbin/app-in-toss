/** 상수 — docs/FUNCTIONAL_SPEC.md §0 */

export const SCHEMA_VERSION = 1;

/* ── 시간 ─────────────────────────────────────────────────── */
export const DAY_MIN = 1440;
/** 기록 1건 최대 길이 */
export const MAX_SHIFT_MIN = 1440;
/** 시간 피커 단위(분) */
export const TIME_STEP_MIN = 15;

/* ── 공제 입력 범위 (net-pay 간이세액표와 같다) ───────────── */
export const DEPENDENTS_MIN = 1;
export const DEPENDENTS_MAX = 11;
export const CHILDREN_MAX = 10;

/* ── 게이트 ───────────────────────────────────────────────── */
/** 무료로 쓸 수 있는 근무지 수 */
export const WORKPLACE_FREE = 1;
/** 무료로 볼 수 있는 과거 월 수 (이번 달 + 2) */
export const MONTHS_FREE_BACK = 2;

/* ── 입력 상한 ────────────────────────────────────────────── */
export const WAGE_MAX = 1_000_000;
export const EXTRA_PAY_MAX = 10_000_000;
export const BREAK_MIN_MAX = 1_439;
export const PAYDAY_MIN = 1;
export const PAYDAY_MAX = 31;

/* ── 공유 카드 ────────────────────────────────────────────── */
export const CARD_W = 1080;
export const CARD_H = 1350;
