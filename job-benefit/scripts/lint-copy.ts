/**
 * 문구 린트 — npm run lint:copy
 * 규칙은 scripts/copy-rules.ts, 검사 로직은 @ait/kit/scripts/copy-lint.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCopyLinter, reportAndExit, type Finding } from '@ait/kit/scripts/copy-lint';
import { ALLOW, RULES } from './copy-rules';

const ROOT = resolve(import.meta.dirname, '..');
const { check } = createCopyLinter(RULES, ALLOW);
const findings: Finding[] = [];

const file = 'src/i18n/ko.json';
const data = JSON.parse(readFileSync(resolve(ROOT, file), 'utf-8')) as Record<string, string>;
for (const [key, value] of Object.entries(data)) check(file, key, value, findings);

/*
 * 카피 일람(docs/SCREEN_FLOW.md 5장)이 ko.json 의 원본이다 — 문서에 그렇게 적어 두었으니
 * 실제로 같은지 검사한다. 한 번 어긋나기 시작하면 문서가 조용히 낡는다.
 */
const flow = readFileSync(resolve(ROOT, 'docs/SCREEN_FLOW.md'), 'utf-8');
const listed = new Set([...flow.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1] as string));
const keys = Object.keys(data);
const missing = keys.filter((k) => !listed.has(k));
const stale = [...listed].filter((k) => k.includes('.') && !keys.includes(k));
if (missing.length > 0 || stale.length > 0) {
  console.error('\n카피 일람과 ko.json 이 어긋납니다 — docs/SCREEN_FLOW.md 5장');
  for (const k of missing) console.error(`  · 문서에 없음: ${k}`);
  for (const k of stale) console.error(`  · ko.json 에 없음: ${k}`);
  process.exit(1);
}

reportAndExit(findings, 'docs/PRD.md 2-1(원칙 A), 2-2(원칙 B), 1-2(무엇이 아닌가)를 확인하세요.');
