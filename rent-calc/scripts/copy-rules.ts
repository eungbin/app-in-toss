/**
 * 문구 규칙 — docs/FUNCTIONAL_SPEC.md §3-15 (원칙 A, B, C)
 * 검사·보고 로직은 @ait/kit/scripts/copy-lint 에 있다. 여기에는 규칙만 둔다.
 *
 * 이 앱은 "법정 상한 초과"를 판정하므로 net-pay보다 단정·권고 어휘가 더 위험하다.
 * "위반"·"불법"·"거절하세요"는 법률 자문으로 읽힌다(docs/PRD.md 2-2 B3).
 */
import type { Allow, Rule } from '@ait/kit/scripts/copy-lint';

export const RULES: Rule[] = [
  // 원칙 A — 금융 상품과의 거리
  { name: '대출', re: /대출/, group: 'A' },
  { name: '보증보험', re: /보증보험|HUG|HF|SGI/, group: 'A' },
  { name: '카드납', re: /카드 ?납/, group: 'A' },
  { name: '적금·예금', re: /적금|예금/, group: 'A' },
  { name: '투자', re: /투자/, group: 'A' },
  { name: '한도', re: /한도/, group: 'A' },

  // 원칙 B — 단정·권고 (법률 자문으로 읽히지 않게)
  { name: '위반·불법', re: /위반|불법/, group: 'B' },
  { name: '소송·고소', re: /소송|고소/, group: 'B' },
  { name: '거절 권유', re: /거절하/, group: 'B' },
  { name: '수락 권유', re: /받아들이/, group: 'B' },
  { name: '추천', re: /추천/, group: 'B' },
  { name: '유리·불리', re: /유리해|불리해/, group: 'B' },
  { name: '손해·이득', re: /손해|이득/, group: 'B' },
  { name: '최적', re: /최적/, group: 'B' },
  { name: '정확한 판정', re: /정확한 ?판정/, group: 'B' },
  { name: '확실', re: /확실/, group: 'B' },

  // 원칙 C — 중개·시세 (부동산 중개 서비스로 읽히지 않게)
  { name: '시세', re: /시세/, group: 'C' },
  { name: '매물', re: /매물|급매/, group: 'C' },
];

export const ALLOW: Allow[] = [
  {
    file: 'src/i18n/ko.json',
    key: 'broker.capApplied',
    rule: '한도',
    why: '"한도액"은 공인중개사법 시행규칙 별표 1의 항목명이다',
  },
  {
    file: 'src/i18n/ko.json',
    key: 'broker.result',
    rule: '한도',
    why: '별표 1 항목명(한도액)을 결과에 그대로 쓴다',
  },
];
