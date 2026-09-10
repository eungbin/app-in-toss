/** 앱 상수 — 법정 수치는 src/data 에 있다. 여기에는 앱 자체의 값만 둔다 */
export const APP_NAME = 'job-benefit';
export const VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;
/** 저장할 수 있는 계산 개수(무료) */
export const SAVED_FREE = 3;
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? '';
/** 설정에서 링크하는 같은 개발자의 다른 미니앱 */
export const OTHER_APPS = [
  { key: 's04.others.workJournal', sub: '근무시간과 예상 실수령액을 한눈에', scheme: 'intoss://work-journal/' },
  { key: 's04.others.netPay', sub: '실수령 역산 월급 계산기', scheme: 'intoss://net-pay/' },
] as const;
