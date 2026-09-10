/**
 * 빌드 산출물 검사 — npm run check:bundle
 *
 * 스캔 로직은 @ait/kit/scripts/bundle-scan. 여기에는 이 앱의 금지 목록만 둔다.
 * fx-replay 가 출시 번들에 남은 테스트 광고 ID 문자열로 반려된 뒤 생긴 가드다.
 *
 * 주의 — 번들에는 시행규칙 별표 2 **원문**(체불·미달·위반 같은 말이 들어 있다)이 함께
 * 들어간다. 그래서 그 낱말을 금지 패턴에 넣지 않는다. 막아야 하는 것은 **앱이 하는 말**이다.
 */
import { resolve } from 'node:path';
import {
  COMMON_FORBIDDEN,
  reportBundleScan,
  requireDist,
  scanBundle,
  type ForbiddenPattern,
} from '@ait/kit/scripts/bundle-scan';

const DIST = resolve(import.meta.dirname, '../dist/assets');
const release = process.argv.includes('--release');

const APP_FORBIDDEN: ForbiddenPattern[] = [
  // 공공 서비스 오인 — docs/PRD.md 1-2, 2-2 원칙 C
  { pattern: /공식\s*(앱|서비스|계산기)/, label: '공식 서비스 오인 문구' },
  // 뒤에 "하는 서비스가 아니…" 가 오면 우리가 반드시 넣어야 하는 **부정문**이다(docs/PRD.md 1-2).
  // 스캔은 문맥을 못 보므로 여기서 갈라 준다 — 이 예외가 없으면 출시 빌드가 면책 문구에 막힌다.
  {
    pattern: /고용(보험|노동부)(이|가|에서|이나)?\s*제공(?!하는 서비스가 아니)/,
    label: '제공 주체 오인 문구',
  },
  { pattern: /신청\s*대행|접수\s*대행|신청하기/, label: '제공하지 않는 신청·접수 기능 문구' },
  // 퇴사·행동 권고 — 원칙 B
  { pattern: /그만두세요|퇴사하세요|지금\s*그만두면/, label: '퇴사 권고 문구' },
  { pattern: /이득이에요|유리해요/, label: '이득·손해 평가 문구' },
];

requireDist(DIST);
reportBundleScan(scanBundle(DIST, [...COMMON_FORBIDDEN, ...APP_FORBIDDEN]), release);
