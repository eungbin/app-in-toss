/**
 * 앱 상태 표 — 루트에서 `npm run status`.
 *
 * 여러 세션이 같은 저장소에서 서로 다른 앱을 동시에 작업한다. 각 세션의 컨텍스트는
 * 파일을 읽은 시점의 스냅샷이라 남의 앱 상태를 잘못 짚기 쉽다(실제로 겪었다 —
 * net-pay 세션이 fx-replay 의 `.env` 에 실 광고 ID가 있는 것을 보고 "가드에 막힌다"고
 * 지적했는데, 그 앱은 이미 출시·심사 단계라 실 ID가 정상이었다).
 *
 * 그래서 **파일에서 읽어낼 수 있는 것은 문서에 적지 않고 여기서 파생한다.** 문서는 썩지만
 * 파생값은 썩지 않는다. 파생할 수 없는 것(콘솔 등록·심사 제출·반려 사유)만 각 앱이
 * `<앱>/STATUS.md` 에 적고, 이 스크립트가 그 선언값을 함께 보여준다.
 *
 * 광고 ID 값 자체는 절대 출력하지 않는다. 분류만 낸다(.env 는 커밋 금지 대상이다).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');

/* ── 표 출력 (한글은 터미널에서 두 칸을 쓴다) ────────────────────────── */

function width(s: string): number {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    w += (c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0xa4cf) ||
      (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) ||
      (c >= 0xfe30 && c <= 0xfe6f) || (c >= 0xff00 && c <= 0xff60) ||
      (c >= 0xffe0 && c <= 0xffe6) ? 2 : 1;
  }
  return w;
}

function pad(s: string, to: number): string {
  return s + ' '.repeat(Math.max(0, to - width(s)));
}

function table(header: string[], rows: string[][]): string {
  const cols = header.map((h, i) => Math.max(width(h), ...rows.map((r) => width(r[i] ?? ''))));
  const line = (cells: string[]) =>
    '  ' + cells.map((c, i) => pad(c ?? '', cols[i] ?? 0)).join('  ').trimEnd();
  return [line(header), '  ' + cols.map((w) => '─'.repeat(w)).join('  '), ...rows.map(line)].join('\n');
}

/* ── 파생 ────────────────────────────────────────────────────────────── */

function read(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf-8') : null;
}

/** src 아래 모든 파일을 훑는다(node_modules·dist 제외) */
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** `.env` 의 활성 줄만 읽는다. 주석 처리된 값은 아직 쓰이지 않는 값이다 */
function activeEnv(appDir: string): Record<string, string> {
  const text = read(resolve(appDir, '.env'));
  const env: Record<string, string> = {};
  if (!text) return env;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

/** 광고 ID 분류. **값은 내보내지 않는다** */
function adStage(env: Record<string, string>): string {
  const kind = (key: string): string => {
    const v = env[key];
    if (!v) return '없음';
    return v.startsWith('ait-ad-test-') ? '테스트' : '실 ID';
  };
  const rewarded = kind('VITE_AD_REWARDED_ID');
  const banner = kind('VITE_AD_BANNER_ID');
  return rewarded === banner ? rewarded : `혼재(리워드 ${rewarded}/배너 ${banner})`;
}

/** 로컬 시간. toISOString 은 UTC 라 빌드 시각이 어긋나 보인다 */
function localTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function gitLast(pathspec: string): string {
  try {
    return execFileSync('git', ['log', '-1', '--format=%ad  %s', '--date=short', '--', pathspec], {
      cwd: ROOT, encoding: 'utf-8',
    }).trim() || '—';
  } catch {
    return '—';
  }
}

interface App {
  name: string;
  declared: string;
  ad: string;
  deploy: string;
  scan: string;
  safeArea: string;
  artifact: string;
  warnings: string[];
  lastCommit: string;
}

function inspect(name: string): App {
  const dir = resolve(ROOT, name);
  const pkg = JSON.parse(read(resolve(dir, 'package.json')) ?? '{}');
  const scripts: Record<string, string> = pkg.scripts ?? {};
  const warnings: string[] = [];

  /* 단계 — 파생할 수 없다. 앱이 STATUS.md 에 선언한 값을 읽는다 */
  const status = read(resolve(dir, 'STATUS.md'));
  const declared = status?.match(/^-?\s*\*?\*?단계\*?\*?\s*[:：]\s*(.+)$/m)?.[1]?.trim() ?? '—';
  if (!status) warnings.push('STATUS.md 없음 — 콘솔·심사 상태를 알 수 없다');

  /* 업로드 — ait build 는 .ait 를 로컬에 만들기만 한다. 업로드는 ait deploy */
  const hasDeploy = ['deploy', 'deploy:release'].filter((k) => k in scripts).length;
  const deploy = hasDeploy === 2 ? '있음' : hasDeploy === 1 ? '일부' : '없음';
  if (deploy !== '있음') warnings.push('deploy 스크립트 없음 — ait build 만으로는 업로드되지 않는다');

  /* 번들 스캔 — kit 판인지 앱 자체 구현인지 */
  const scanSrc = read(resolve(dir, 'scripts/check-bundle.ts'));
  const scan = !scanSrc ? '없음' : scanSrc.includes('@ait/kit/scripts/bundle-scan') ? 'kit' : '자체';
  if (scan === '없음') warnings.push('번들 스캔 없음 — 번들에 남은 문자열만으로 심사 반려된 적이 있다');

  /* 세이프 에어리어 — kit 훅인지, 앱 자체 구현인지, CSS env() 를 쓰는지 */
  const files = walk(resolve(dir, 'src'));
  let safeArea = '없음';
  for (const f of files) {
    const text = readFileSync(f, 'utf-8');
    if (/import[^;]*useSafeArea[^;]*'@ait\/kit'/s.test(text)) safeArea = 'kit';
    else if (safeArea === '없음' && /useSafeArea/.test(text)) safeArea = '자체';
    if (f.endsWith('.css') && /env\(\s*safe-area-inset/.test(text)) {
      warnings.push('CSS env(safe-area-inset) 사용 — 호스트 값과 이중 적용된다');
    }
  }

  /* 로컬 .ait — 만들어져 있는지. 업로드 여부는 여기서 알 수 없다 */
  const ait = readdirSync(dir).find((f) => f.endsWith('.ait'));
  const artifact = ait ? localTime(statSync(resolve(dir, ait)).mtime) : '없음';

  return {
    name, declared, ad: adStage(activeEnv(dir)), deploy, scan, safeArea, artifact,
    warnings, lastCommit: gitLast(name),
  };
}

/* ── 실행 ────────────────────────────────────────────────────────────── */

const workspaces: string[] = JSON.parse(read(resolve(ROOT, 'package.json'))!).workspaces ?? [];
const apps = workspaces.filter((w) => !w.includes('*') && !w.startsWith('packages/')).map(inspect);

console.log('\n앱인토스 앱 상태');
console.log('파생값은 파일에서 읽었다. 단계는 각 앱 STATUS.md 의 선언값이다.\n');
console.log(
  table(
    ['앱', '단계(선언)', '광고 ID', 'deploy', '번들스캔', '세이프에어리어', '로컬 .ait'],
    apps.map((a) => [a.name, a.declared, a.ad, a.deploy, a.scan, a.safeArea, a.artifact]),
  ),
);

console.log('\n마지막 커밋');
const w = Math.max(...apps.map((a) => width(a.name)), width('@ait/kit'));
for (const a of apps) console.log(`  ${pad(a.name, w)}  ${a.lastCommit}`);
console.log(`  ${pad('@ait/kit', w)}  ${gitLast('packages/ait-kit')}`);

const flagged = apps.filter((a) => a.warnings.length > 0);
if (flagged.length > 0) {
  console.log('\n짚어 둘 것 — 그 앱의 단계에서 정상일 수 있다. 담당 세션이 판단한다.');
  for (const a of flagged) for (const w of a.warnings) console.log(`  · ${a.name}: ${w}`);
}

console.log('\n광고 ID 값은 출력하지 않는다(.env 는 커밋 금지). 분류만 낸다.');
console.log('단계·심사 상태는 파생할 수 없다 → <앱>/STATUS.md. 그 파일은 담당 세션만 고친다.\n');
