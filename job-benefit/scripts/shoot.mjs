/**
 * 콘솔 스크린샷 촬영 — 실기기 없이 만든다.
 *
 *   npm run dev            # 다른 터미널에서 먼저 띄운다 (5178)
 *   npm run shots          # ~/Downloads/job-benefit-upload/*.png (636×1048)
 *
 * 헤드리스 크롬을 CDP 로 몰아 화면마다 상태를 만들고 찍는다. 앱 코드는 건드리지 않는다.
 * 구현은 rent-calc/scripts/shoot.mjs 를 가져와 이 앱의 입력에 맞췄다(PLAYBOOK 6장).
 *
 * 지키는 것 셋.
 *  1) **컷은 요소 밑에서 끊는다.** 뷰포트 높이로 자르면 버튼·표가 반쯤 걸려 렌더링 오류처럼 보인다.
 *  2) **높이를 한 뷰포트로 통일하고 좌우에 흰 여백만 넣는다.** 세로를 잘라 비율을 맞추면 내용이 잘린다.
 *  3) **잠금 화면은 첫 장에 넣지 않는다.** 뼈대 막대가 첫 장에 크게 들어가면 깨진 데이터로 읽힌다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const BASE = 'http://localhost:5178';
const OUT = process.argv[2] ?? `${process.env.HOME}/Downloads/job-benefit-upload`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9222;
const W = 375, H = 812, DSF = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--window-size=${W},${H}`,
  '--hide-scrollbars',
  '--no-first-run',
  '--user-data-dir=/tmp/jb-shots-profile',
], { stdio: 'ignore' });

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('크롬 디버거에 붙지 못했습니다');
}

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); this.session = null;
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.waiting.has(m.id)) { const { res, rej } = this.waiting.get(m.id); this.waiting.delete(m.id);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
    });
  }
  send(method, params = {}, sessionId = this.session) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.waiting.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  async evalJs(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval 실패');
    return r.result.value;
  }
}

/** 페이지에 심는 헬퍼 — 텍스트로 버튼 찾기, 네이티브 setter 로 입력 */
const HELPERS = `
window.__jb = {
  sleep: (ms) => new Promise(r => setTimeout(r, ms)),
  click(text) {
    const el = [...document.querySelectorAll('button, a')].find(b => b.textContent.trim().includes(text));
    if (!el) throw new Error('버튼 없음: ' + text);
    el.click();
  },
  set(el, v) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  },
  /** S01 입력을 한 번에 채운다. 기본은 골든 G1 과 같은 조건이다 */
  fill({ hired = '2023-03-01', quit = '2026-09-01', age = '45', week = '40', holiday = '8', wage = '3000000' } = {}) {
    const d = [...document.querySelectorAll('input[type=date]')];
    this.set(d[0], hired); this.set(d[1], quit);
    const x = [...document.querySelectorAll('input[type=text]')];
    this.set(x[0], age); this.set(x[1], week); this.set(x[2], holiday); this.set(x[3], wage);
  },
};
`;

const SHOTS = [
  {
    // 첫 장은 차별점(판정 + 일수)이다. 잠금 화면은 넣지 않는다
    file: '01-result.png',
    after: 'await __jb.sleep(500); __jb.fill(); await __jb.sleep(250); __jb.click("결과 보기"); await __jb.sleep(600)',
    // 기준일·면책(.basis)까지 넣으면 991px 로 한 뷰포트를 넘는다. 첫 7일 안내에서 끊는다
    cut: '.note',
  },
  {
    // 무엇을 넣는지. 하단 고정 버튼이 sticky 라 한 뷰포트만 찍는다
    file: '02-input.png',
    after: 'await __jb.sleep(500); __jb.fill(); await __jb.sleep(400)',
    viewportOnly: true,
  },
  {
    file: '03-curve.png',
    unlock: true,
    after: 'await __jb.sleep(500); __jb.fill({ quit: "2026-09-01", age: "52", hired: "2016-01-01", wage: "4000000" }); await __jb.sleep(250); __jb.click("결과 보기"); await __jb.sleep(500); __jb.click("재취업하면"); await __jb.sleep(700)',
    cut: '.card__items',
  },
  {
    // 별표 2 원문 — 자발적 퇴사여도 받을 수 있는 사정. 시트는 화면을 덮으므로 한 뷰포트만
    file: '04-reasons.png',
    after: 'await __jb.sleep(500); __jb.click("어떤 사정인지 보기"); await __jb.sleep(700)',
    viewportOnly: true,
  },
  {
    file: '05-settings.png',
    after: 'await __jb.sleep(500); document.querySelector(\'button[aria-label="데이터 출처"]\').click(); await __jb.sleep(600)',
    // .basis(버전 줄)까지 넣으면 846px 로 넘친다. 다른 미니앱 목록에서 끊는다
    cut: '.list',
  },
];

mkdirSync(OUT, { recursive: true });

const url = await wsUrl();
const ws = new WebSocket(url);
await new Promise((r) => ws.addEventListener('open', r));
const cdp = new Cdp(ws);

const { targetInfos } = await cdp.send('Target.getTargets');
const page = targetInfos.find((t) => t.type === 'page');
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
cdp.session = sessionId;

await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: W, height: H, deviceScaleFactor: DSF, mobile: true,
});

// 잠금 해제를 미리 넣어 둘 수 있도록 오리진을 한 번 방문한다
await cdp.send('Page.navigate', { url: BASE });
await sleep(1200);

for (const shot of SHOTS) {
  // 오리진을 먼저 연 뒤에 localStorage 를 만진다. about:blank 에서는 접근이 막힌다
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(1000);
  await cdp.evalJs(
    shot.unlock
      ? 'const d=new Date(); d.setHours(24,0,0,0); localStorage.setItem("jb.unlock", JSON.stringify({until:d.getTime()})); true'
      : 'localStorage.removeItem("jb.unlock"); true',
  );
  // 해제 상태는 마운트 시점에 읽는다 — 다시 띄워야 반영된다
  await cdp.send('Page.reload');
  await sleep(1400);
  await cdp.evalJs(HELPERS);
  await cdp.evalJs(`(async () => { ${shot.after} })()`);
  // 마지막으로 넣을 요소의 밑에서 끊는다. 반쯤 걸린 요소가 남으면 렌더링 오류처럼 보인다.
  // 시트처럼 화면을 덮는 화면과 하단 고정 버튼이 있는 화면은 한 뷰포트만 찍는다
  const height = shot.viewportOnly
    ? H
    : await cdp.evalJs(
        `(() => { const els=[...document.querySelectorAll(${JSON.stringify(shot.cut)})];
           const el = els[els.length-1];
           if (!el) throw new Error('컷 기준 요소 없음: ${shot.cut}');
           return Math.ceil(el.getBoundingClientRect().bottom + window.scrollY + 16); })()`,
      );
  // 한 뷰포트를 넘으면 후처리에서 세로를 줄여야 하고 글자가 작아진다. 여기서 바로 막는다
  if (height > H) {
    throw new Error(
      `${shot.file}: 컷이 한 뷰포트(${H}px)를 넘습니다 — ${height}px.\n` +
        `  → cut 을 더 위쪽 요소로 바꾸거나 viewportOnly 를 쓰세요.`,
    );
  }
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: W, height, scale: 1 },
  });
  writeFileSync(`${OUT}/${shot.file}`, Buffer.from(data, 'base64'));
  console.log(`${shot.file} 촬영 — ${W}x${height} CSS px`);
}

ws.close();
chrome.kill();

// 콘솔 규격(636×1048)으로 맞춘다. 앱 배경이 흰색이라 여백은 보이지 않는다
const PY = `
import sys, glob, os
from PIL import Image
out = sys.argv[1]
TARGET, FRAME_H, WHITE = (636, 1048), 812 * 3, (255, 255, 255)
for f in sorted(glob.glob(os.path.join(out, '*.png'))):
    im = Image.open(f).convert('RGB')
    w, h = im.size
    if (w, h) == TARGET:
        continue
    assert h <= FRAME_H, (f, h)
    fr = Image.new('RGB', (w, FRAME_H), WHITE); fr.paste(im, (0, 0))
    need = round(FRAME_H * TARGET[0] / TARGET[1])
    pd = Image.new('RGB', (need, FRAME_H), WHITE); pd.paste(fr, ((need - w) // 2, 0))
    pd.resize(TARGET, Image.LANCZOS).save(f, 'PNG', optimize=True)
    print(f"{os.path.basename(f)} -> 636x1048 ({os.path.getsize(f)//1024}KB)")
`;
await new Promise((res, rej) => {
  const py = spawn('python3', ['-c', PY, OUT], { stdio: 'inherit' });
  py.on('exit', (code) => (code === 0 ? res() : rej(new Error(`후처리 실패 (${code})`))));
});
console.log(`\n${OUT} 에 5장. 콘솔 → 앱 정보 → 스크린샷에 순서대로 올린다.`);
