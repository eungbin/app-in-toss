/**
 * 문구 규칙 — docs/PRD.md 2-2 (원칙 B), 2-1 (원칙 A)
 * 검사·보고 로직은 @ait/kit/scripts/copy-lint. 여기에는 규칙만 둔다.
 *
 * 이 앱의 위험은 셋이다.
 *   A 금융 상품 — 실업급여를 담보로 한 대출·생활비 상품과 거리를 둔다.
 *   B 권고 — "지금 그만두면 이득" 류. 퇴사를 권하는 앱이 아니다.
 *   C 오인 — 고용보험·고용노동부가 제공·인증한 서비스로 읽히면 반려된다. 신청·접수도 하지 않는다.
 *
 * 대상은 `src/i18n/ko.json` 뿐이다. `src/data/quit-reasons.json` 은 시행규칙 별표 2 **원문**이라
 * "체불"·"미달"·"위반" 이 들어 있고, 그것을 그대로 보여 주는 것이 이 화면의 목적이다.
 */
import type { Allow, Rule } from '@ait/kit/scripts/copy-lint';

export const RULES: Rule[] = [
  // A — 금융 상품과의 거리
  { name: '대출', re: /대출/, group: 'A' },
  { name: '선지급·가불', re: /선지급|가불|당겨\s?받/, group: 'A' },
  // "고용보험 가입 기간" 은 이 앱의 핵심 문구다. 사회보험은 상품이 아니므로 규칙에서 뺀다 —
  // 키마다 예외를 두면 문구를 새로 쓸 때마다 예외가 늘어난다.
  { name: '카드·보험 상품', re: /카드\s?추천|(?<!고용|건강|산재|사회)보험\s?(상품|가입)/, group: 'A' },
  { name: '적금·투자', re: /적금|투자/, group: 'A' },

  // B — 퇴사·행동을 권하지 않는다
  { name: '퇴사 권고', re: /그만두세요|퇴사하세요|그만두는\s?게/, group: 'B' },
  { name: '이득·손해 평가', re: /이득|손해|유리해요|불리해요/, group: 'B' },
  { name: '추천', re: /추천/, group: 'B' },
  { name: '확실·보장', re: /확실|보장/, group: 'B' },
  { name: '단정', re: /받을\s?수\s?있어요|받으실\s?수\s?있어요/, group: 'B' },

  // C — 공공 서비스 오인·신청 대행
  { name: '공식·인증', re: /공식|인증/, group: 'C' },
  { name: '제공 주체 오인', re: /고용보험(이|에서)\s?제공|고용노동부(가|에서)\s?제공/, group: 'C' },
  { name: '신청·접수 기능', re: /신청하기|접수하기|신청\s?대행/, group: 'C' },
];

export const ALLOW: Allow[] = [
  {
    file: 'src/i18n/ko.json',
    key: 's04.about.notOfficial',
    rule: '제공 주체 오인',
    why: '"제공하는 서비스가 아니에요" 라는 부정문이다 — docs/PRD.md 1-2',
  },
  {
    file: 'src/i18n/ko.json',
    key: 's04.about.notOfficial',
    rule: '신청·접수 기능',
    why: '"신청·접수는 하지 않아요" 라는 부정문이다 — docs/PRD.md 1-2',
  },
  {
    file: 'src/i18n/ko.json',
    key: 'b01.lead',
    rule: '단정',
    why: '별표 2 안내문이고 바로 뒤에 "증빙과 인정 여부는 고용센터가 판단해요" 가 붙는다 — docs/PRD.md 2-2',
  },
  {
    file: 'src/i18n/ko.json',
    key: 's02.reason.voluntaryNotJustified',
    rule: '단정',
    why: '"원칙적으로 받을 수 없어요" 라는 부정문이다',
  },
];
