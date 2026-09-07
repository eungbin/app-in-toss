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

/**
 * 역산 이진 탐색용 연봉 격자.
 * 실수령은 연봉에 대해 단조가 아니지만, 이 격자 위에서는 단조 증가다.
 * 측정상 60만 원부터 안전하고(최대 단차 27,499원 < 격자당 세전 증가), 여유를 둬 120만 원.
 * `net.test.ts`가 이 성질을 검증한다.
 */
export const REVERSE_GRID = 1_200_000;
/** 역산 탐색 상한 연봉 */
export const GROSS_MAX = 5_000_000_000;

export const SAVED_FREE = 3;
export const SAVED_CAP = 20;

/** 월 소정근로시간 기본값 (주 40시간) */
export const ORDINARY_HOURS_DEFAULT = 209;
/** 1일 소정근로시간 */
export const ORDINARY_HOURS_PER_DAY = 8;
