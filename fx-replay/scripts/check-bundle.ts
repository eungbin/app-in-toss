/**
 * 빌드 산출물 검사 — 설정만 보지 말고 실제 번들을 본다.
 *
 * 심사는 런타임 동작이 아니라 **번들에 문자열이 있는지**를 본다.
 * 테스트용 광고 그룹 ID가 죽은 상수로 남아 있어도 반려된다(실제로 겪었다).
 *   npm run check:bundle -- --release
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DIST = resolve(import.meta.dirname, '../dist/assets');
const release = process.argv.includes('--release');

/** 출시 번들에 있어선 안 되는 문자열 */
const FORBIDDEN = [
  { pattern: /ait-ad-test-/, label: '테스트용 광고 그룹 ID' },
  { pattern: /example\.(com|org|net)/, label: '자리표시자 도메인' },
];

let files: string[] = [];
try {
  files = readdirSync(DIST).filter((f) => f.endsWith('.js') || f.endsWith('.css'));
} catch {
  console.error(`빌드 산출물이 없습니다: ${DIST}\n  → vite build 를 먼저 실행하세요.`);
  process.exit(1);
}

const hits: string[] = [];
for (const f of files) {
  const text = readFileSync(resolve(DIST, f), 'utf-8');
  for (const { pattern, label } of FORBIDDEN) {
    const m = text.match(pattern);
    if (m) hits.push(`${f}: ${label} ("${m[0]}")`);
  }
}

if (hits.length > 0) {
  if (release) {
    console.error('출시 번들에 있어선 안 되는 값이 들어 있습니다.\n');
    for (const h of hits) console.error(`- ${h}`);
    console.error('\n번들 문자열은 런타임에 덮어써도 심사에서 검출됩니다.');
    process.exit(1);
  }
  console.log('테스트 번들 — 아래 값이 들어 있습니다(출시 빌드에서는 막힙니다).');
  for (const h of hits) console.log(`  · ${h}`);
} else {
  console.log(`번들 검사 통과 (${files.length}개 파일)`);
}
