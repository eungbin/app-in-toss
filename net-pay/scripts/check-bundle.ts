/**
 * 빌드 산출물 검사 — docs/SUBMISSION.md 3-1
 *   npm run check:bundle            테스트 빌드: 알려만 준다
 *   npm run check:bundle:release    출시 빌드: 걸리면 막는다
 *
 * 스캔 로직은 @ait/kit/scripts/bundle-scan 에 있다. 여기에는 이 앱의 금지 목록만 둔다.
 * fx-replay 가 테스트 광고 ID 문자열 때문에 심사 반려를 받아 생긴 가드다.
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
  // 개발용으로 손으로 만든 세액표가 섞이면 meta.source 에 이 문구가 남는다
  { pattern: /국세청 근로소득 간이세액표 아님/, label: '개발용 합성 세액표 표기' },
];

requireDist(DIST);
reportBundleScan(scanBundle(DIST, [...COMMON_FORBIDDEN, ...APP_FORBIDDEN]), release);
