/**
 * 빌드 산출물 검사 — 설정만 보지 말고 실제 번들을 본다.
 *
 * 앱인토스 심사는 런타임 동작이 아니라 **번들에 문자열이 있는지**를 본다.
 * 테스트용 광고 그룹 ID가 죽은 상수로 남아 있어도 반려된다(fx-replay 에서 실제로 겪었다).
 * 설정값만 검사하는 가드로는 이런 건을 잡을 수 없다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ForbiddenPattern {
  pattern: RegExp;
  label: string;
}

/** 어느 앱이든 출시 번들에 있어선 안 되는 것 */
export const COMMON_FORBIDDEN: ForbiddenPattern[] = [
  { pattern: /ait-ad-test-/, label: '테스트용 광고 그룹 ID' },
  { pattern: /example\.(com|org|net)/, label: '자리표시자 도메인' },
];

export interface ScanResult {
  fileCount: number;
  hits: string[];
}

/** distDir 안의 js·css 를 훑어 금지 문자열을 찾는다 */
export function scanBundle(distDir: string, forbidden: ForbiddenPattern[]): ScanResult {
  const files = readdirSync(distDir).filter((f) => f.endsWith('.js') || f.endsWith('.css'));
  const hits: string[] = [];
  for (const f of files) {
    const text = readFileSync(resolve(distDir, f), 'utf-8');
    for (const { pattern, label } of forbidden) {
      const m = text.match(pattern);
      if (m) hits.push(`${f}: ${label} ("${m[0]}")`);
    }
  }
  return { fileCount: files.length, hits };
}

/**
 * 결과를 보고한다. 출시 빌드에서 걸리면 exit 1.
 * 테스트 빌드에서는 알려만 주고 통과시킨다(개발 단계에서는 테스트 ID가 정상이다).
 */
export function reportBundleScan(result: ScanResult, release: boolean): void {
  if (result.hits.length === 0) {
    console.log(`번들 검사 통과 (${result.fileCount}개 파일)`);
    return;
  }
  if (release) {
    console.error('출시 번들에 있어선 안 되는 값이 들어 있습니다.\n');
    for (const h of result.hits) console.error(`- ${h}`);
    console.error('\n번들 문자열은 런타임에 덮어써도 심사에서 검출됩니다.');
    process.exit(1);
  }
  console.log('테스트 번들 — 아래 값이 들어 있습니다(출시 빌드에서는 막힙니다).');
  for (const h of result.hits) console.log(`  · ${h}`);
}

/** distDir 이 없을 때의 안내 후 종료 */
export function requireDist(distDir: string): void {
  try {
    readdirSync(distDir);
  } catch {
    console.error(`빌드 산출물이 없습니다: ${distDir}\n  → vite build 를 먼저 실행하세요.`);
    process.exit(1);
  }
}
