/**
 * 문구 린트 엔진. 규칙·예외·대상은 각 앱이 정의하고, 검사·보고는 여기서 한다.
 */
export interface Rule {
  name: string;
  re: RegExp;
  group: string;
}

export interface Allow {
  file: string;
  key: string;
  rule: string;
  why: string;
}

export interface Finding {
  file: string;
  key: string;
  rule: string;
  group: string;
  text: string;
}

export function createCopyLinter(rules: readonly Rule[], allow: readonly Allow[]) {
  const isAllowed = (file: string, key: string, rule: string) =>
    allow.some((a) => a.file === file && a.key === key && a.rule === rule);

  /** groups를 주면 해당 그룹 규칙만 적용한다 */
  function check(file: string, key: string, text: string, findings: Finding[], groups?: readonly string[]) {
    for (const r of rules) {
      if (groups && !groups.includes(r.group)) continue;
      if (r.re.test(text) && !isAllowed(file, key, r.name)) {
        findings.push({ file, key, rule: r.name, group: r.group, text });
      }
    }
  }

  return { check };
}

/** 위반이 있으면 출력 후 exit 1, 없으면 통과 메시지 */
export function reportAndExit(findings: readonly Finding[], hint: string): void {
  if (findings.length > 0) {
    console.error(`문구 린트 실패: ${findings.length}건\n`);
    for (const f of findings) {
      console.error(`  ${f.file} › ${f.key}`);
      console.error(`    [${f.group}] ${f.rule}`);
      console.error(`    "${f.text}"\n`);
    }
    console.error(hint);
    process.exit(1);
  }
  console.log('문구 린트 통과');
}
