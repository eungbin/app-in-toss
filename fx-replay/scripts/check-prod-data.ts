/**
 * 프로덕션 빌드 가드 — 개발용 합성 데이터가 번들에 남아 있으면 실패시킨다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = resolve(import.meta.dirname, '../src/data/series');
const bad: string[] = [];

for (const name of readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const json = JSON.parse(readFileSync(resolve(DIR, name), 'utf-8')) as {
    source?: { dev?: boolean };
  };
  if (json.source?.dev) bad.push(name);
}

if (bad.length > 0) {
  console.error('개발용 합성 데이터가 남아 있습니다: ' + bad.join(', '));
  console.error('ECOS_API_KEY 를 설정하고 `npm run data:fetch` 로 실데이터를 받으세요.');
  process.exit(1);
}
console.log('프로덕션 데이터 확인 완료');
