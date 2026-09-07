/** 상수 — docs/FUNCTIONAL_SPEC.md §0 */

export const SCHEMA_VERSION = 1;

/** 기본 비과세 식대(월) */
export const NONTAX_MEAL_DEFAULT = 200_000;

export const DEPENDENTS_MIN = 1;
/** 간이세액표의 공제대상가족 열 수 */
export const DEPENDENTS_MAX = 11;
export const CHILDREN_MAX = 10;

/** 시간축 시작 연도 (docs/PRD.md 11-2 확정: 2021~현재) */
export const TIMELINE_FROM_YEAR = 2021;

/** 역산 허용 오차(월 실수령, 원) */
export const REVERSE_TOL = 1_000;
export const REVERSE_MAX_ITER = 40;
/** 역산 탐색 상한 연봉 */
export const GROSS_MAX = 5_000_000_000;

export const SAVED_FREE = 3;
export const SAVED_CAP = 20;

/** 월 소정근로시간 기본값 (주 40시간) */
export const ORDINARY_HOURS_DEFAULT = 209;
/** 1일 소정근로시간 */
export const ORDINARY_HOURS_PER_DAY = 8;
