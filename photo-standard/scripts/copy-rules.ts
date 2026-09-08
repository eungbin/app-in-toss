/**
 * 문구 규칙 — docs/FUNCTIONAL_SPEC.md §3-12 (원칙 B, C)
 * 검사·보고 로직은 @ait/kit/scripts/copy-lint 에 있다. 여기에는 규칙만 둔다.
 *
 * 이 앱의 위험은 금융이 아니라 **기관 심사 결과를 예단하는 문구**다.
 * "이 사진이면 통과합니다" 는 앱이 보장할 수 없는 말이고, 사용자가 그 말을 믿고
 * 제출했다가 반려되면 앱이 책임 범위를 넘은 것이 된다.
 */
import type { Allow, Rule } from '@ait/kit/scripts/copy-lint';

export const RULES: Rule[] = [
  // 원칙 B — 발급·심사 결과를 예단하지 않는다
  { name: '통과·합격', re: /통과|합격/, group: 'B' },
  { name: '승인', re: /승인/, group: 'B' },
  { name: '보장', re: /보장/, group: 'B' },
  { name: '무조건', re: /무조건/, group: 'B' },
  { name: '확실', re: /확실/, group: 'B' },
  { name: '100%', re: /100\s*%/, group: 'B' },
  { name: '발급 단정', re: /발급돼요|발급됩니다/, group: 'B' },
  { name: '수리 단정', re: /받아 ?줘요|받아 ?줍니다/, group: 'B' },
  { name: '반려 단정', re: /반려돼요|반려됩니다/, group: 'B' },

  // 원칙 C — 제공하지 않는 기능을 말하지 않는다
  { name: '배경 제거', re: /배경 ?제거|누끼/, group: 'C' },
  { name: '보정', re: /보정|리터칭|뽀샵/, group: 'C' },
  { name: '자동 얼굴', re: /얼굴 ?인식|자동 ?크롭/, group: 'C' },
];

export const ALLOW: Allow[] = [
  {
    // 면책 문구는 "보장하지 않아요" 라고 말해야 한다. 금지어를 부정형으로 쓰는 자리다.
    file: 'src/i18n/ko.json',
    key: 'result.disclaimer',
    rule: '보장',
    why: '보장하지 않는다는 면책 문구다 — docs/PRD.md 2-2 B3',
  },
  {
    // 배경을 지운 사진을 쓰지 말라는 안내. 기능 홍보가 아니라 금지 안내다.
    file: 'src/i18n/ko.json',
    key: 'notes.noEdit',
    rule: '보정',
    why: '보정한 사진을 쓸 수 없다는 안내다 — docs/PRD.md 2-3 C4',
  },
];
