/**
 * 빌드 산출물 검사 — npm run check:bundle
 *
 * 스캔 로직은 @ait/kit/scripts/bundle-scan 에 있다. 여기에는 이 앱의 금지 목록만 둔다.
 * fx-replay 가 출시 번들에 남은 테스트 광고 ID 문자열 때문에 심사 반려를 받아 생긴 가드다.
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

/** 이 앱에만 해당하는 금지 문자열 — docs/PRD.md 2-2 원칙 B */
const APP_FORBIDDEN: ForbiddenPattern[] = [
  // 노무 판정을 대신하는 문구. 문구 린트가 ko.json 을 막지만, 코드에 직접 박힌 문자열은
  // 린트를 통과하고 번들에만 남는다. 산출물을 직접 검색해 확인한다.
  { pattern: /체불|최저임금\s*미달|노동청/, label: '노무 판정·권고 문구' },
  // 제공하지 않는 기능이 번들 문자열로 남으면 심사에서 기능으로 읽힌다
  { pattern: /출퇴근\s*자동|자동\s*기록|위치\s*추적/, label: '제공하지 않는 자동 기록 기능 문구' },
  // 진단 빌드(VITE_DIAG)를 켜면 남는 문구. 출시 번들에 있으면 내부 상태가 사용자에게 보인다.
  { pattern: /진단 \(눌러서 닫기\)/, label: '진단 카드 문구' },
];

requireDist(DIST);
reportBundleScan(scanBundle(DIST, [...COMMON_FORBIDDEN, ...APP_FORBIDDEN]), release);
