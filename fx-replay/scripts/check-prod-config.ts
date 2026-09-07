/**
 * 빌드 가드 — 실수로 출시될 수 있는 값들을 막는다.
 *
 * 단계가 둘이다.
 *   테스트 빌드(`npm run build`)      — QR 테스트용. **테스트 광고 ID가 정상이다.**
 *                                       앱인토스 정책상 개발 단계에서는 테스트 ID를 써야 하고,
 *                                       실제 광고 ID로 테스트하면 정책 위반으로 간주된다.
 *   출시 빌드(`npm run build:release`) — 실 광고 ID를 요구한다.
 *
 * 두 단계 모두 검사: 개발용 합성 데이터, 고객문의 이메일.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from './env';

loadEnv();

const release = process.argv.includes('--release');
const problems: string[] = [];
const notes: string[] = [];

/* 1) 합성 데이터 — 두 단계 모두 막는다 */
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

/* 2) 고객문의 이메일 — 두 단계 모두 막는다. 콘솔 등록값과 같아야 한다 */
const email = process.env.VITE_SUPPORT_EMAIL;
if (!email) {
  problems.push(
    `고객문의 이메일(VITE_SUPPORT_EMAIL)이 없습니다.\n` +
      `  → 설정 화면에 "—" 로 표시됩니다. 콘솔에 등록한 이메일과 같은 값을 .env 에 넣으세요.`,
  );
} else if (/example\.(com|org|net)$/i.test(email) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  problems.push(`고객문의 이메일이 유효하지 않습니다: ${email}`);
}

/* 3) 광고 ID — 출시 빌드에서만 실 ID를 요구한다 */
const AD_KEYS = [
  ['VITE_AD_REWARDED_ID', '보상형'],
  ['VITE_AD_BANNER_ID', '배너'],
] as const;

for (const [key, label] of AD_KEYS) {
  const v = process.env[key];
  const isTest = !v || v.startsWith('ait-ad-test-');
  if (!isTest) {
    if (!release) {
      problems.push(
        `${label} 광고 ID(${key})에 실 ID가 들어 있습니다: ${v}\n` +
          `  → 개발·QR 테스트 단계에서 실제 광고 ID를 쓰면 정책 위반으로 간주됩니다.\n` +
          `     테스트에는 값을 비우거나 ait-ad-test-* 를 쓰고, 출시는 \`npm run build:release\` 로 하세요.`,
      );
    }
    continue;
  }
  if (release) {
    problems.push(
      `${label} 광고 ID(${key})가 ${v ? `테스트 ID입니다: ${v}` : '없습니다'}.\n` +
        `  → 콘솔에서 광고 그룹을 만들고 .env 에 넣으세요. 테스트 ID로 출시하면 수익이 집계되지 않습니다.`,
    );
  } else {
    notes.push(`${label} 광고: 테스트 ID로 빌드됩니다(개발 단계에서 정상).`);
  }
}

if (problems.length > 0) {
  console.error(`${release ? '출시' : '테스트'} 빌드를 막았습니다.\n`);
  for (const p of problems) console.error(`- ${p}\n`);
  process.exit(1);
}
console.log(`${release ? '출시' : '테스트'} 빌드 설정 확인 완료`);
for (const n of notes) console.log(`  · ${n}`);
