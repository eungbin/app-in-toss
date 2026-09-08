/** 상수 — docs/FUNCTIONAL_SPEC.md §0 */

/** 하루 무료 저장 횟수 */
export const SAVE_FREE_PER_DAY = 3;

/**
 * Device.getPhotos / openCamera 에 넘길 maxWidth.
 * 최대 프리셋(미국 비자 1200px)의 2배. 실질 상한은 실기기 확인 대상이다(오픈 이슈 1).
 */
export const INPUT_MAX_WIDTH = 2400;

/** JPEG 품질 이분 탐색 범위 */
export const Q_LO = 0.4;
export const Q_HI = 0.95;
/** 이분 탐색 반복 횟수. 해상도 약 0.002 */
export const Q_ITER = 8;
/** maxBytes 가 없는 프리셋을 jpeg 로 낼 때 쓰는 고정 품질 */
export const Q_FIXED = 0.92;

/** 비율 일치 허용 오차(1%) */
export const RATIO_TOL = 0.01;

/** 규격 출처 확인일이 이보다 오래되면 빌드에서 경고한다 */
export const SOURCE_STALE_DAYS = 365;

/** Storage 스키마 버전 */
export const SCHEMA_VERSION = 1;

/** cm ↔ px 환산용 */
export const MM_PER_INCH = 25.4;
export const DEFAULT_DPI = 300;

/** 직접 입력 상한 */
export const CUSTOM_MAX_PX = 4000;
