/**
 * 문구 린트 — docs/FUNCTIONAL_SPEC.md §3-15
 *   npm run lint:copy
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

reportAndExit(findings, 'docs/PRD.md 2-1절(원칙 A), 2-2절(원칙 B)를 확인하세요.');
