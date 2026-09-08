/**
 * 빌드 가드 — net-pay·fx-replay·rent-calc 와 같은 2단계 구조.
 *
 *   테스트 빌드(`npm run build`)      — QR 테스트용. 테스트 광고 ID가 정상이다.
 *   출시 빌드(`npm run build:release`) — 실 광고 ID를 요구한다.
 *
 * 규격 출처 신선도는 `npm run check:data`, 번들에 남은 문자열은 `npm run check:bundle`.
 */
import { resolve } from 'node:path';
import { loadEnv } from '@ait/kit/scripts/env';

loadEnv(resolve(import.meta.dirname, '../.env'));

const release = process.argv.includes('--release');
const problems: string[] = [];
const notes: string[] = [];

/* 1) 고객문의 이메일 — 두 단계 모두 막는다 */
const email = process.env.VITE_SUPPORT_EMAIL;
if (!email) {
  problems.push(
    '고객문의 이메일(VITE_SUPPORT_EMAIL)이 없습니다.\n' +
      '  → 콘솔 등록값은 programmer97@naver.com 입니다(2026-09-08 확인). 같은 값을 .env 에 넣으세요.',
  );
} else if (/example\.(com|org|net)$/i.test(email) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  problems.push(`고객문의 이메일이 유효하지 않습니다: ${email}`);
}

/* 2) 광고 ID */
const AD_KEYS = [
  ['VITE_AD_REWARDED_ID', '보상형'],
  ['VITE_AD_BANNER_ID', '배너'],
] as const;

for (const [key, label] of AD_KEYS) {
  const v = process.env[key];
  const isTest = !v || v.startsWith('ait-ad-test-');
  if (!isTest && !release) {
    problems.push(
      `${label} 광고 ID(${key})에 실 ID가 들어 있습니다: ${v}\n` +
        '  → 개발·QR 테스트 단계에서 실제 광고 ID를 쓰면 정책 위반으로 간주됩니다.\n' +
        '     테스트에는 값을 비우거나 ait-ad-test-* 를 쓰고, 출시는 `npm run build:release` 로 하세요.',
    );
  }
  if (release && isTest) {
    problems.push(
      `${label} 광고 ID(${key})가 ${v ? '테스트 ID' : '비어 있음'} 입니다.\n` +
        '  → 출시 빌드에는 콘솔에서 발급받은 실 ID가 필요합니다.\n' +
        '     이 앱은 구판이 광고를 등록조차 하지 않아 수익이 0이었습니다. 반드시 발급하세요.',
    );
  }
  if (!release && isTest) notes.push(`${label} 광고 ID: ${v ? v : '(없음 — 광고를 붙이지 않습니다)'}`);
}

for (const n of notes) console.log(`  ${n}`);
if (problems.length > 0) {
  console.error(`\ncheck:config${release ? ':release' : ''} 실패 — ${problems.length}건\n`);
  for (const p of problems) console.error(`• ${p}`);
  process.exit(1);
}
console.log(`check:config${release ? ':release' : ''} 통과`);
