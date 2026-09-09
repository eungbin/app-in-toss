/**
 * 문구 규칙 — docs/FUNCTIONAL_SPEC.md §3-16 (원칙 A, B)
 * 검사·보고 로직은 @ait/kit/scripts/copy-lint 에 있다. 여기에는 규칙만 둔다.
 *
 * 이 앱의 위험은 **노무 판정을 대신하는 문구**다. "최저임금 미달이에요", "체불이에요" 는
 * 앱이 내릴 판정이 아니고, 그 말을 믿고 사용자가 다투면 앱이 책임 범위를 넘은 것이 된다.
 * 수치와 기준만 보여 주고 판단은 사용자에게 남긴다.
 */
import type { Allow, Rule } from '@ait/kit/scripts/copy-lint';

export const RULES: Rule[] = [
  // 원칙 A — 금융 상품과의 거리
  { name: '대출', re: /대출/, group: 'A' },
  { name: '선지급·가불', re: /선지급|가불|당겨\s?받/, group: 'A' },
  { name: '카드 추천', re: /카드\s?추천/, group: 'A' },
  { name: '보험 상품', re: /보험\s?상품|보험\s?가입/, group: 'A' },
  { name: '적금·투자', re: /적금|투자/, group: 'A' },

  // 원칙 B — 노무 판정·권고를 하지 않는다
  { name: '체불', re: /체불/, group: 'B' },
  { name: '위반', re: /위반/, group: 'B' },
  { name: '미달', re: /미달/, group: 'B' },
  { name: '불법', re: /불법/, group: 'B' },
  { name: '신고 권고', re: /신고하세요|신고해|고발/, group: 'B' },
  { name: '노동청 안내', re: /노동청|고용노동부에\s?문의/, group: 'B' },
  { name: '청구 권고', re: /청구하세요|받아야\s?(해요|합니다)/, group: 'B' },
  { name: '손해·이득 평가', re: /손해|이득/, group: 'B' },
  { name: '확실', re: /확실/, group: 'B' },
  { name: '법적 효력 단정', re: /증빙이에요|증빙입니다/, group: 'B' },
];

export const ALLOW: Allow[] = [
  {
    // 계산 기준 박스는 "법적 증빙은 아니에요" 라고 말해야 한다. 금지어를 부정형으로 쓰는 자리다.
    file: 'src/i18n/ko.json',
    key: 'settings.basis.body',
    rule: '법적 효력 단정',
    why: '법적 증빙이 아니라는 면책 문구다 — docs/PRD.md 2-2 B1',
  },
];
