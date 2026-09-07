/** docs/FUNCTIONAL_SPEC.md §0 */
export const CUTOFF_MONTHS = 12;
/** 오늘의 리플레이 기본 봉 개수 */
export const PLAY_BARS = 60;
export const TICK_MS = 2000;
export const START_P = 1_000_000;
export const CONVERT_RATIOS = [25, 50, 100] as const;
export const FREE_PLAYS_PER_DAY = 3;
export const AD_BONUS_CAP = 5;
export const NOTE_LIMIT_FREE = 10;
export const NOTE_LIMIT_HARD = 500;
export const RECENT_SEGMENTS = 30;
export const SCHEMA_VERSION = 1;
export const HISTORY_LIMIT = 50;
export const MEMO_MAX = 100;
/** 무작위 구간이 챕터 구간과 겹칠 수 있는 최대 거래일 */
export const CHAPTER_OVERLAP_MAX = 30;
/** 최근 구간 재등장 방지 반경 */
export const SEGMENT_EXCLUDE_RADIUS = 30;
