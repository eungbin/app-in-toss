/**
 * 원문 → src/data — npm run data:build
 *
 * 하는 일 셋.
 *   1) 별표 1(소정급여일수) 표를 파싱한다.
 *   2) 별표 2(정당한 이직 사유)는 **손으로 옮긴 quit-reasons.json 을 원문과 대조**한다.
 *      평문 표는 글자마다 줄바꿈이 들어와 기계 파싱이 단어를 붙여 버린다 —
 *      "기업의\n사정상" 은 공백 없이 이어야 하는지 아닌지 구분되지 않는다.
 *      그래서 옮겨 적고, 공백을 모두 지운 문자열로 포함 여부를 검사한다(work-journal 방식).
 *   3) legal.json 의 조문 상수를 조문 원문과 대조한다. 어긋나면 실패한다.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAmendedOn, squeeze } from './law';
import type { BenefitDaysFile, LegalFile, QuitReasonsFile } from '../src/types';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = resolve(ROOT, 'data-src');
const DATA = resolve(ROOT, 'src/data');

const readSrc = (name: string): string => {
  const p = resolve(SRC, name);
  if (!existsSync(p)) throw new Error(`${name} 이 없습니다. 먼저 npm run data:fetch 를 돌리세요.`);
  return readFileSync(p, 'utf-8');
};
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf-8')) as T;

const errors: string[] = [];
const today = new Date().toISOString().slice(0, 10);

/* ── 1) 별표 1 소정급여일수 ─────────────────────────────── */
function parseBenefitDays(text: string): BenefitDaysFile {
  const amendedOn = parseAmendedOn(text);
  if (!amendedOn) throw new Error('별표 1 에서 개정일을 읽지 못했습니다');

  const row = (label: string): [number, number, number, number, number] => {
    const line = text.split('\n').find((l) => squeeze(l).includes(label));
    if (!line) throw new Error(`별표 1 에서 "${label}" 행을 찾지 못했습니다`);
    const days = [...line.matchAll(/(\d+)일/g)].map((m) => Number(m[1]));
    if (days.length !== 5) throw new Error(`"${label}" 행에서 일수 5개를 읽지 못했습니다: ${days.join(',')}`);
    return days as [number, number, number, number, number];
  };

  const under50 = row('50세미만');
  const from50 = row('50세이상');

  // 표의 성질 — 피보험기간이 길수록 줄지 않는다
  for (const [name, r] of [['50세 미만', under50], ['50세 이상', from50]] as const) {
    for (let i = 1; i < r.length; i++) {
      if ((r[i] as number) < (r[i - 1] as number)) errors.push(`별표 1 ${name} 행이 단조가 아닙니다: ${r.join(',')}`);
    }
    if ((r[0] as number) !== 120) errors.push(`별표 1 ${name} 행의 1년 미만이 120일이 아닙니다: ${r[0]}`);
  }
  if ((from50[4] as number) !== 270) errors.push(`별표 1 상한이 270일이 아닙니다: ${from50[4]}`);

  const note = squeeze(text).includes('장애인은50세이상인것으로보아')
    ? '「장애인고용촉진 및 직업재활법」 제2조제1호에 따른 장애인은 50세 이상인 것으로 보아 위 표를 적용한다.'
    : (errors.push('별표 1 비고(장애인 조항)를 원문에서 확인하지 못했습니다'), '');

  return {
    meta: {
      source: `고용보험법 별표 1 구직급여의 소정급여일수 <개정 ${amendedOn}>`,
      url: 'https://www.law.go.kr/법령/고용보험법',
      amendedOn,
      fetchedAt: today,
      license: '법령은 저작권 보호 대상이 아니다(저작권법 제7조 제1호)',
    },
    under50,
    from50,
    note,
  };
}

/* ── 2) 별표 2 정당한 이직 사유 — 옮긴 것을 원문과 대조 ── */
function verifyQuitReasons(text: string): QuitReasonsFile {
  const file = readJson<QuitReasonsFile>(resolve(DATA, 'quit-reasons.json'));
  const amendedOn = parseAmendedOn(text);
  if (!amendedOn) throw new Error('별표 2 에서 개정일을 읽지 못했습니다');
  if (file.meta.amendedOn !== amendedOn) {
    errors.push(
      `별표 2 가 개정됐습니다. quit-reasons.json 은 ${file.meta.amendedOn}, 원문은 ${amendedOn} 입니다.\n` +
        `    → data-src/byl-quit-reasons.txt 를 읽고 items 를 다시 옮긴 뒤 meta.amendedOn 을 고치세요.`,
    );
  }

  const flat = squeeze(text);
  for (const item of file.items) {
    for (const s of [item.text, ...(item.sub ?? [])]) {
      const needle = squeeze(s);
      if (!flat.includes(needle)) {
        errors.push(`별표 2 원문에 없는 문구입니다 (항목 ${item.id}): ${s.slice(0, 40)}…`);
      }
    }
  }
  // 항목 번호가 빠지지 않았는지 — 원문의 "13." 까지와 "3의2." 가 있어야 한다
  const ids = new Set(file.items.map((i) => i.id));
  for (const need of ['1', '2', '3', '3의2', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']) {
    if (!ids.has(need)) errors.push(`별표 2 항목 ${need} 가 quit-reasons.json 에 없습니다`);
  }
  return { ...file, meta: { ...file.meta, fetchedAt: today } };
}

/* ── 3) legal.json 조문 상수 대조 ───────────────────────── */
function verifyLegal(): void {
  const legal = readJson<LegalFile>(resolve(DATA, 'legal.json'));
  /** [조문 파일, 원문에 있어야 하는 문구, 그 문구가 뒷받침하는 상수, 값] */
  const checks: Array<[string, string, string, unknown]> = [
    ['jo-ei-40.txt', '피보험단위기간(제41조에따른피보험단위기간을말한다.이하같다)이합산하여180일이상일것', 'insuredDaysMin', legal.insuredDaysMin === 180],
    ['jo-ei-40.txt', '기준기간은이직일이전18개월로하되', 'basePeriodMonths', legal.basePeriodMonths === 18],
    ['jo-ei-46.txt', '기초일액에100분의60을곱한금액', 'rateNormal', legal.rateNormal === 0.6],
    ['jo-ei-46.txt', '기초일액에100분의80을곱한금액', 'rateMin', legal.rateMin === 0.8],
    ['jo-ei-49.txt', '7일간은대기기간으로보아구직급여를지급하지아니한다', 'waitingDays', legal.waitingDays === 7],
    ['jo-eid-68.txt', '11만3500원', 'baseDailyCap', legal.baseDailyCap === 113_500],
    ['jo-eid-84.txt', '실업의신고일부터14일이지난후재취업한수급자격자', 'early.afterDays', legal.early.afterDays === 14],
    ['jo-eid-84.txt', '소정급여일수를2분의1이상남기고재취업한경우', 'early.remainRatio', legal.early.remainRatio === 0.5],
    ['jo-eid-84.txt', '12개월이상계속하여고용된경우', 'early.employMonths', legal.early.employMonths === 12],
    ['jo-eid-85.txt', '구직급여일액에미지급일수의2분의1을곱한금액', 'early.rate', legal.early.rate === 0.5],
    ['jo-eir-91-2.txt', '48시간×8시간', 'stdHours.weekDiv', legal.stdHours.weekDiv === 48],
    ['jo-eir-91-2.txt', '209시간×8시간', 'stdHours.monthDiv', legal.stdHours.monthDiv === 209],
    ['jo-eir-91-2.txt', '÷28', 'stdHours.fourWeekDiv', legal.stdHours.fourWeekDiv === 28],
    ['jo-lsa-2.txt', '3개월동안에그근로자에게지급된임금의총액을그기간의총일수로나눈금액', '평균임금 정의', true],
    ['jo-ei-45.txt', '이직전1일소정근로시간에이직일당시적용되던「최저임금법」에따른시간단위에해당하는최저임금액을곱한금액', '최저기초일액 정의', true],
  ];
  for (const [file, needle, what, ok] of checks) {
    const flat = squeeze(readSrc(file));
    if (!flat.includes(squeeze(needle))) {
      errors.push(`${file} 원문에서 "${needle.slice(0, 30)}…" 를 찾지 못했습니다 — 개정됐는지 확인하세요 (${what}).`);
    }
    if (!ok) errors.push(`legal.json 의 ${what} 값이 원문과 다릅니다.`);
  }
}

/* ── 실행 ───────────────────────────────────────────────── */
const days = parseBenefitDays(readSrc('byl-benefit-days.txt'));
const reasons = verifyQuitReasons(readSrc('byl-quit-reasons.txt'));
verifyLegal();

if (errors.length > 0) {
  console.error('\ndata:build 실패');
  for (const e of errors) console.error(`  · ${e}`);
  process.exit(1);
}

writeFileSync(resolve(DATA, 'benefit-days.json'), JSON.stringify(days, null, 2) + '\n', 'utf-8');
writeFileSync(resolve(DATA, 'quit-reasons.json'), JSON.stringify(reasons, null, 2) + '\n', 'utf-8');
console.log(
  `data:build 통과 — 별표 1 (${days.meta.amendedOn}) ${days.under50.join('/')} · ${days.from50.join('/')}, ` +
    `별표 2 (${reasons.meta.amendedOn}) ${reasons.items.length}개 항목, 조문 상수 15건 대조`,
);
