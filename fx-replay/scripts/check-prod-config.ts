/**
 * 프로덕션 빌드 가드 — 실수로 출시될 수 있는 값들을 막는다.
 *   1) 개발용 합성 시세 데이터
 *   2) 테스트 광고 ID (실 ID 미설정)
 *   3) 고객문의 이메일 미설정·자리표시자
 * `npm run build` 앞에서 돈다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from './env';

loadEnv();

const problems: string[] = [];

/* 1) 합성 데이터 */
const DIR = resolve(import.meta.dirname, '../src/data/series');
const dev = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => {
    const json = JSON.parse(readFileSync(resolve(DIR, f), 'utf-8')) as { source?: { dev?: boolean } };
    return json.source?.dev === true;
  });
if (dev.length > 0) {
  problems.push(
    `개발용 합성 데이터가 남아 있습니다: ${dev.join(', ')}\n` +
      `  → ECOS_API_KEY 를 설정하고 \`npm run data:fetch\` 로 실데이터를 받으세요.`,
  );
}

/* 2) 광고 ID */
for (const [key, label] of [
  ['VITE_AD_REWARDED_ID', '보상형'],
  ['VITE_AD_BANNER_ID', '배너'],
] as const) {
  const v = process.env[key];
  if (!v) {
    problems.push(
      `${label} 광고 ID(${key})가 없어 kit 의 테스트 ID로 빌드됩니다.\n` +
        `  → 콘솔에서 광고 그룹을 만들고 .env 에 넣으세요. 실 광고 ID 없이 출시하면 수익이 집계되지 않습니다.`,
    );
  } else if (v.startsWith('ait-ad-test-')) {
    problems.push(
      `${label} 광고 ID(${key})가 테스트 ID입니다: ${v}\n` +
        `  → 실제 광고 ID로 테스트하면 정책 위반이지만, 테스트 ID로 출시하면 수익이 없습니다.`,
    );
  }
}

/* 3) 고객문의 이메일 */
const email = process.env.VITE_SUPPORT_EMAIL;
if (!email) {
  problems.push(
    `고객문의 이메일(VITE_SUPPORT_EMAIL)이 없습니다.\n` +
      `  → 설정 화면에 "—" 로 표시됩니다. 콘솔에 등록한 이메일과 같은 값을 .env 에 넣으세요.`,
  );
} else if (/example\.(com|org|net)$/i.test(email) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  problems.push(`고객문의 이메일이 유효하지 않습니다: ${email}`);
}

if (problems.length > 0) {
  console.error('프로덕션 빌드를 막았습니다.\n');
  for (const p of problems) console.error(`- ${p}\n`);
  process.exit(1);
}
console.log('프로덕션 설정 확인 완료');
