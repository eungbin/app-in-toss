/**
 * 원문 수집 — npm run data:fetch
 * 별표 2건과 대조용 조문을 data-src/ 에 보존한다. 파싱은 data:build 가 한다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bylText, joText } from './law';

const OUT = resolve(import.meta.dirname, '../data-src');

const JO: Array<[string, string, string, string]> = [
  ['고용보험법', '0040', '00', 'ei-40'],
  ['고용보험법', '0045', '00', 'ei-45'],
  ['고용보험법', '0046', '00', 'ei-46'],
  ['고용보험법', '0049', '00', 'ei-49'],
  ['고용보험법', '0050', '00', 'ei-50'],
  ['고용보험법', '0058', '00', 'ei-58'],
  ['고용보험법시행령', '0068', '00', 'eid-68'],
  ['고용보험법시행령', '0084', '00', 'eid-84'],
  ['고용보험법시행령', '0085', '00', 'eid-85'],
  ['고용보험법시행규칙', '0091', '02', 'eir-91-2'],
  ['근로기준법', '0002', '00', 'lsa-2'],
];

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });

  for (const [law, no, name] of [
    ['고용보험법', '0001', 'byl-benefit-days'],
    ['고용보험법시행규칙', '0002', 'byl-quit-reasons'],
  ] as Array<[string, string, string]>) {
    const { text, bylSeq } = await bylText(law, no);
    if (text.length < 500) throw new Error(`${name}: 받은 텍스트가 너무 짧습니다 (${text.length}자)`);
    writeFileSync(resolve(OUT, `${name}.txt`), text, 'utf-8');
    console.log(`  ${name}.txt — ${text.length}자 (bylSeq ${bylSeq})`);
  }

  for (const [law, no, br, name] of JO) {
    const text = await joText(law, no, br);
    if (text.length < 200) throw new Error(`${name}: 조문 본문이 너무 짧습니다 (${text.length}자)`);
    writeFileSync(resolve(OUT, `jo-${name}.txt`), text, 'utf-8');
    console.log(`  jo-${name}.txt — ${text.length}자`);
  }

  console.log('data:fetch 완료 — 파싱과 원문 대조는 npm run data:build');
}

await main();
