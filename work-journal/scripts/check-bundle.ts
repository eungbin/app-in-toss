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

/** 이 앱에만 해당하는 금지 문자열 */
const APP_FORBIDDEN: ForbiddenPattern[] = [
  // 제공하지 않는 기능이 번들 문자열로 남으면 심사에서 기능으로 읽힌다 — docs/PRD.md 2-3
  { pattern: /누끼|배경\s*제거/, label: '제공하지 않는 배경 제거 기능 문구' },
  // 개발 전용 파일 입력(src/engine/photo.ts). import.meta.env.DEV 치환으로 제거되어야 한다.
  // 남아 있으면 앨범 권한을 우회하는 입력 경로가 출시 번들에 들어간 것이다.
  { pattern: /ps-dev-file-pick/, label: '개발 전용 파일 입력 마커' },
  // 진단 카드(VITE_DIAG). 출시 번들에 남으면 내부 오류 문자열이 사용자에게 보인다.
  { pattern: /진단 \(눌러서 닫기\)/, label: '진단 카드 문구' },
];

requireDist(DIST);
reportBundleScan(scanBundle(DIST, [...COMMON_FORBIDDEN, ...APP_FORBIDDEN]), release);
