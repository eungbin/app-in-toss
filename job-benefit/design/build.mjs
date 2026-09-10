import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, '../src/styles.css'), 'utf-8');
for (const f of readdirSync(here).filter((f) => f.endsWith('.body.html'))) {
  const body = readFileSync(resolve(here, f), 'utf-8');
  const name = f.replace('.body.html', '.dc.html');
  const out = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
/* job-benefit/src/styles.css 를 그대로 넣었다 — 시안과 구현이 같은 값을 쓴다 */
${css}
/* 시안 전용: 아트보드는 앱 화면 폭에 맞춘 프레임이다 */
.frame { width: 100%; min-height: 100%; background: var(--bg); display: flex; flex-direction: column; }
.frame__flow { flex: 1; }
.frame__bottom { padding: 12px 20px calc(16px + var(--safe-bottom)); background: var(--bg); border-top: 1px solid var(--line); }
.btn-primary { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 56px; border: none; border-radius: var(--r-md); background: var(--primary); color: #fff; font-size: var(--fs-headline); font-weight: 700; }
.spec { margin: 0; padding: 6px 20px 10px; background: var(--gray-900); color: var(--gray-300); font-size: 11px; letter-spacing: 0; line-height: 1.5; }
.ad { display: flex; align-items: center; justify-content: center; height: 56px; border-radius: var(--r-sm); background: var(--surface); color: var(--gray-400); font-size: var(--fs-micro); }
  </style>
</helmet>
${body.trimEnd()}
</x-dc>
</body>
</html>
`;
  writeFileSync(resolve(here, name), out, 'utf-8');
  console.log(name, (out.length / 1024).toFixed(0) + 'KB');
}
