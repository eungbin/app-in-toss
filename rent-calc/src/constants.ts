/**
 * 상수 — docs/FUNCTIONAL_SPEC.md §0
 *
 * 법령에서 온 값은 여기에 리터럴로 두지 않고 `src/data/legal.json`에서 읽는다.
 * 이 파일의 LEGAL_* 는 그 파일과의 일치를 테스트로 고정하기 위한 기대값이다.
 */

export const SCHEMA_VERSION = 1;

/* ── 법령 상수 (legal.json과 일치해야 한다) ────────────────── */

/** 주택임대차보호법 제7조 제2항 — 20분의 1 */
export const INCREASE_CAP = 1 / 20;
/** 제7조 제1항 후단 — 1년 이내 재증액 제한 */
export const INCREASE_INTERVAL_DAYS = 365;
/** 시행령 제9조 제1항 — 연 1할 */
export const CONVERSION_CEILING = 0.1;
/** 시행령 제9조 제2항 — 연 2% */
export const CONVERSION_SPREAD = 0.02;

/** 공인중개사법 시행규칙 제20조 제5항 — 보증금 + 월세 × 100 */
export const RENT_MULTIPLIER = 100;
/** 같은 항 — 환산액이 5천만 원 미만이면 × 70으로 재계산 */
export const RENT_MULTIPLIER_UNDER_50M = 70;
export const RENT_MULTIPLIER_THRESHOLD = 50_000_000;

/** 시행규칙 제20조 제4항 — 주거용 오피스텔 면적 요건(㎡) */
export const OFFICETEL_AREA_MAX = 85;
/** 같은 항 — 요건을 벗어난 경우 0.9% 이내 협의 */
export const OFFICETEL_OTHER_RATIO = 0.009;

/** 부동산 거래신고법 — 보증금 6천만 원 "초과" */
export const REPORT_DEPOSIT = 60_000_000;
/** 같은 법 — 월세 30만 원 "초과" */
export const REPORT_RENT = 300_000;
/** 계약 후 신고 기한(일) */
export const REPORT_DAYS = 30;

/* ── 제품 상수 ─────────────────────────────────────────────── */

/** 시간축 시작 연도 (docs/PRD.md 확정: 2021~현재 + 최신) */
export const TIMELINE_FROM_YEAR = 2021;

export const SAVED_FREE = 3;
export const SAVED_CAP = 20;

/** 입력 디바운스(ms) */
export const DEBOUNCE_MS = 300;

/**
 * 기준금리 신선도. asOf 가 오래되면 화면에 안내하고, 더 오래되면 프로덕션 빌드를 막는다.
 * 금통위는 약 6주 간격이라 90일이면 한 번은 지나쳤다는 뜻이다.
 */
export const BASERATE_STALE_WARN_DAYS = 90;
export const BASERATE_STALE_BLOCK_DAYS = 180;

/**
 * 판정 경계 가드.
 *
 * 화면은 월세를 1원 단위로 표시하고, 공공 계산기도 법정 최대 월세를 반올림해서 준다
 * (예: 229,166.67 → 229,167). 사용자가 그 값을 그대로 입력하면 환산보증금은 상한을
 * 수백 원 넘게 되는데, 이를 "상한 초과"라고 표시하면 계산기가 알려 준 금액이 위법으로
 * 보이는 모순이 생긴다.
 *
 * 그래서 **월세 1원에 해당하는 환산보증금**(= 12 ÷ 전환율, 5%면 240원)까지는 초과로
 * 보지 않는다. 표시 해상도보다 작은 차이는 판정하지 않는다는 뜻이다.
 * docs/FACT_CHECK.md 3-3 P9 참조.
 */
export function eqToleranceFor(rate: number): number {
  return 12 / rate;
}
