/** 도메인 타입 — docs/FUNCTIONAL_SPEC.md §1 */

/* ── 기준금리 (src/data/baserate.json) ─────────────────────── */

export interface BaseRateChange {
  /** 시행일 "YYYY-MM-DD". 이 날부터 유효 */
  from: string;
  /** 0.03 = 3.00% */
  rate: number;
}

export interface BaseRateFile {
  meta: {
    source: string;
    /** 수집일 */
    fetchedAt: string;
    /** 시계열 마지막 날짜. check:data 신선도 검사 대상 */
    asOf: string;
    license: string;
    /** ECOS 이용지침이 요구하는 출처 표기 문자열 */
    attribution: string;
    /** 개발용 합성 데이터. true면 프로덕션 빌드가 차단된다 */
    dev?: true;
  };
  /** 변동 시점만. from 오름차순 */
  changes: BaseRateChange[];
}

/* ── 중개보수 별표 (src/data/brokerage.json) ───────────────── */

export type BrokerageKind = 'sale' | 'lease';

export interface BrokerageBand {
  kind: BrokerageKind;
  /** 거래금액 하한(이상) */
  lo: number;
  /** 거래금액 상한(미만). null이면 상한 없음 */
  hi: number | null;
  /** 0.005 = 0.5% */
  ratio: number;
  /** 한도액(원). null이면 없음 */
  cap: number | null;
}

export interface BrokerageFile {
  meta: {
    source: string;
    lsiSeq: string;
    bylSeq: { table1: string; table2: string };
    amendedOn: string;
    fetchedAt: string;
    url: string;
    license: string;
  };
  /** 별표 1 — 주택 */
  housing: BrokerageBand[];
  /** 별표 2 — 주거용 오피스텔(조건 충족) */
  officetel: Record<BrokerageKind, number>;
}

/* ── 조문 상수 (src/data/legal.json) ───────────────────────── */

export type LegalKey =
  | 'increaseCap'
  | 'increaseIntervalDays'
  | 'conversionCeiling'
  | 'conversionSpread'
  | 'rentMultiplier'
  | 'rentMultiplierUnder50m'
  | 'rentMultiplierThreshold'
  | 'officetelAreaMax'
  | 'officetelOtherRatio'
  | 'reportDeposit'
  | 'reportRent'
  | 'reportDays';

export interface LegalItem {
  key: LegalKey;
  value: number;
  /** "주택임대차보호법 제7조 제2항" */
  law: string;
  url: string;
  verifiedAt: string;
}

export interface LegalFile {
  items: LegalItem[];
}

/* ── 판정 (engine/judge.ts) ────────────────────────────────── */

export type Mode = 'renew' | 'new';

/** 원 단위 정수. rent 0 = 전세 */
export interface Terms {
  deposit: number;
  rent: number;
}

export interface JudgeInput {
  mode: Mode;
  current: Terms;
  proposed: Terms;
  /** "YYYY-MM-DD". 직전 계약·증액일 */
  lastChangeDate?: string;
  /** 0.03 = 3.00% */
  baseRate: number;
}

export type Verdict = 'within' | 'exceeds';

/**
 * 갱신·기간 중 변경 결과.
 * mode·verdict를 리터럴로 좁혀 두면 `ConvertResult`와의 합집합을 mode로 구분할 수 있다.
 */
export interface JudgeResult {
  mode: 'renew';
  verdict: Verdict;
  legalRate: number;
  baseRate: number;
  currentEq: number;
  proposedEq: number;
  /** 0.05 = 5.00% */
  increase: number;
  /** 0 이상. 허용 환산보증금 초과분 */
  excessEq: number;
  excessAsRent: number;
  excessAsDeposit: number;
  /** 제안 보증금 고정 시 허용 최대 월세. 보증금만으로 초과면 null */
  maxRentForProposedDeposit: number | null;
  /** 제안 월세 고정 시 허용 최대 보증금. 월세만으로 초과면 null */
  maxDepositForProposedRent: number | null;
  /** 항목별 단순 인상률(참고 표시). 분모가 0이면 null */
  itemIncrease: { deposit: number | null; rent: number | null };
  /** lastChangeDate 없으면 null */
  withinOneYear: boolean | null;
}

/** 신규 계약 모드 결과 — 환산 참고치만 */
export interface ConvertResult {
  mode: 'new';
  verdict: null;
  legalRate: number;
  baseRate: number;
  /** 제안 보증금을 전부 월세로 돌릴 때 */
  rentIfAllDeposit: number;
  /** 제안 월세를 전부 보증금으로 돌릴 때 */
  depositIfAllRent: number;
}

/* ── 중개보수 (engine/brokerage.ts) ────────────────────────── */

export type OfficetelKind = 'no' | 'qualified' | 'other';

export interface BrokerageInput {
  kind: BrokerageKind;
  deposit: number;
  rent: number;
  officetel: OfficetelKind;
}

export interface BrokerageResult {
  /** 거래금액 */
  tx: number;
  /** 100 또는 70 */
  usedMultiplier: number;
  ratio: number;
  cap: number | null;
  /** 상한 금액 */
  fee: number;
  /** 요율 적용 전 금액(한도 적용 여부 표시용) */
  rawFee: number;
  /** 0.9% 협의 구간 */
  negotiable: boolean;
}

/* ── 임대차 신고 (engine/report.ts) ────────────────────────── */

export type ReportReason = 'deposit' | 'rent';

export interface ReportResult {
  required: boolean;
  reasons: ReportReason[];
  /** 계약일이 있으면 "YYYY-MM-DD" */
  deadline: string | null;
  overdue: boolean;
}

/* ── 시간축 (engine/timeline.ts) ───────────────────────────── */

export interface TimelineRow {
  /** "2021" 또는 "최신" */
  label: string;
  date: string;
  baseRate: number;
  legalRate: number;
  /** 그 시점 법정 전환율로 보증금 전액을 월세로 돌린 값 */
  maxRent: number;
}

/* ── 저장 (Storage) ────────────────────────────────────────── */

export interface Scenario {
  id: string;
  name?: string;
  input: JudgeInput;
  createdAt: string;
  result: { verdict: Verdict | null; increase: number };
}

export interface Unlock {
  until: number | null;
}

export interface Settings {
  /** 사용자가 직접 입력한 기준금리. 없으면 번들 최신값 */
  baseRateOverride?: number;
  cardHideDeposit: boolean;
}
