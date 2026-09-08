/**
 * 문구 규칙 — docs/FUNCTIONAL_SPEC.md §3-16 (원칙 A, B)
 * 검사·보고 로직은 @ait/kit/scripts/copy-lint 에 있다. 여기에는 규칙만 둔다.
 */
import type { Allow, Rule } from '@ait/kit/scripts/copy-lint';

export const RULES: Rule[] = [
  // 원칙 A — 금융 상품과의 거리 (앱인토스 오픈 정책: 금융 상품 관련 서비스 금지)
  { name: '대출', re: /대출/, group: 'A' },
  { name: '적금·예금', re: /적금|예금/, group: 'A' },
  { name: '카드 추천', re: /카드 ?추천/, group: 'A' },
  { name: '증권·주식·펀드', re: /증권|주식|펀드/, group: 'A' },
  { name: '투자', re: /투자/, group: 'A' },
  { name: '보험 상품·가입', re: /보험 ?(상품|가입)/, group: 'A' },
  { name: '한도', re: /한도/, group: 'A' },

  // 원칙 B — 권고·평가 (세무 자문으로 읽히지 않게)
  { name: '추천', re: /추천/, group: 'B' },
  { name: '적정 연봉', re: /적정 ?연봉/, group: 'B' },
  { name: '불러라', re: /불러(라|야|세요)/, group: 'B' },
  { name: '이직 권유', re: /이직하(세요|라)/, group: 'B' },
  { name: '유리·불리', re: /유리해|불리해/, group: 'B' },
  { name: '손해·이득', re: /손해|이득/, group: 'B' },
  { name: '최적', re: /최적/, group: 'B' },
  { name: '절세', re: /절세|세금 ?줄이/, group: 'B' },
  { name: '환급 받는 법', re: /환급 ?받는 ?법/, group: 'B' },
  { name: '정확한 세액', re: /정확한 ?세액/, group: 'B' },
  { name: '확실', re: /확실/, group: 'B' },
];

/**
 * 예외 없음. 공제 항목 이름을 한 줄로 늘어놓던 `home.result.items` 를 결과 화면
 * 범례(도넛과 같은 색·순서)로 바꾸면서 예외가 필요 없어졌다.
 */
export const ALLOW: Allow[] = [];
