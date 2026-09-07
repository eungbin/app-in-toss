/**
 * 문구 린트 — docs/FUNCTIONAL_SPEC.md §3-12 (원칙 B, C)
 * 예측·권고·경쟁 어휘를 빌드 단계에서 차단한다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCopyLinter, reportAndExit, type Allow, type Finding, type Rule } from '@ait/kit/scripts/copy-lint';

const ROOT = resolve(import.meta.dirname, '..');

const RULES: Rule[] = [
  // 원칙 B — 예측·권고·현재 시점
  { name: '지금', re: /지금/, group: 'B' },
  { name: '현재', re: /현재/, group: 'B' },
  { name: '타이밍', re: /타이밍/, group: 'B' },
  // "사라졌다/사라지다"는 허용, 명령형 "사라"만 차단
  { name: '사라(명령형)', re: /사라(?![지졌질져])/, group: 'B' },
  { name: '팔아라', re: /팔아라|사세요|파세요|매도하세요|매수하세요/, group: 'B' },
  { name: '노리다', re: /노리|노려/, group: 'B' },
  { name: '추천', re: /추천/, group: 'B' },
  { name: '유망', re: /유망/, group: 'B' },
  { name: '전략', re: /전략/, group: 'B' },
  { name: '패턴', re: /패턴/, group: 'B' },
  { name: '이럴 때', re: /이럴 ?때/, group: 'B' },
  { name: '다음에는', re: /다음에는/, group: 'B' },
  { name: '앞으로', re: /앞으로/, group: 'B' },
  { name: '전망', re: /전망/, group: 'B' },
  { name: '예상', re: /예상된다|예상됩니다|예상돼요/, group: 'B' },
  { name: '될 것이다', re: /될 것이|할 것이다/, group: 'B' },
  { name: '수익 내는', re: /수익 ?내는|수익률 ?랭킹/, group: 'B' },
  { name: '매수·매도', re: /매수|매도/, group: 'B' },
  { name: '포지션', re: /포지션/, group: 'B' },
  // 원칙 C — 경쟁·게임성
  { name: '승리', re: /승리/, group: 'C' },
  { name: '클리어', re: /클리어/, group: 'C' },
  { name: '레벨', re: /레벨/, group: 'C' },
  { name: '콤보', re: /콤보/, group: 'C' },
  { name: '연승', re: /연승/, group: 'C' },
  { name: '랭킹', re: /랭킹|순위표/, group: 'C' },
  { name: '1위', re: /1위|일등/, group: 'C' },
  // 평가 어휘 — 해설에서 금지
  { name: '평가어휘', re: /아쉽|최고의|최악의|잘했|못했/, group: 'EVAL' },
];

/** 예외: 문맥상 안전하다고 확인한 (파일, 키) 조합 */
const ALLOW: Allow[] = [
  {
    file: 'src/i18n/ko.json',
    key: 'home.resume.quitConfirm',
    rule: '지금',
    why: '"지금까지의 선택" — 시세가 아니라 진행 상황을 가리킴',
  },
  {
    file: 'src/i18n/ko.json',
    key: 'm01.fail',
    rule: '지금',
    why: '"지금은 광고를 불러올 수 없어요" — 광고 로딩 상태 안내',
  },
];

/**
 * EVAL(평가 어휘) 규칙은 시나리오 서술문에만 적용한다.
 * UI 안내 문구의 "불러오지 못했어요" 같은 표현은 사용자 판단에 대한 평가가 아니다.
 * groups를 생략하면 전체(B, C, EVAL) 적용.
 */
const { check } = createCopyLinter(RULES, ALLOW);

function lintI18n(findings: Finding[]) {
  const file = 'src/i18n/ko.json';
  const data = JSON.parse(readFileSync(resolve(ROOT, file), 'utf-8')) as Record<string, string>;
  for (const [key, value] of Object.entries(data)) check(file, key, value, findings, ['B', 'C']);
}

function lintScenarios(findings: Finding[]) {
  const dir = resolve(ROOT, 'src/data/scenarios');
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const file = `src/data/scenarios/${name}`;
    const s = JSON.parse(readFileSync(resolve(dir, name), 'utf-8')) as {
      title: string;
      intro: string[];
      events: Array<{ label: string; body: string }>;
      debrief: string[];
    };
    check(file, 'title', s.title, findings);
    s.intro.forEach((t, i) => check(file, `intro[${i}]`, t, findings));
    s.events.forEach((e, i) => {
      check(file, `events[${i}].label`, e.label, findings);
      check(file, `events[${i}].body`, e.body, findings);
    });
    s.debrief.forEach((t, i) => check(file, `debrief[${i}]`, t, findings));
  }
}

/** 길이 규칙 — §1-2 */
function lintLengths(findings: Finding[]) {
  const dir = resolve(ROOT, 'src/data/scenarios');
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const file = `src/data/scenarios/${name}`;
    const s = JSON.parse(readFileSync(resolve(dir, name), 'utf-8')) as {
      events: Array<{ label: string; body: string }>;
    };
    s.events.forEach((e, i) => {
      if (e.label.length > 14)
        findings.push({ file, key: `events[${i}].label`, rule: 'label ≤ 14자', group: 'LEN', text: e.label });
      if (e.body.length > 80)
        findings.push({ file, key: `events[${i}].body`, rule: 'body ≤ 80자', group: 'LEN', text: e.body });
    });
  }
}

const findings: Finding[] = [];
lintI18n(findings);
lintScenarios(findings);
lintLengths(findings);

reportAndExit(findings, 'docs/PRD.md 2-2절(원칙 B), 2-3절(원칙 C)를 확인하세요.');
