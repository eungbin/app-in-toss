/**
 * 콘솔 스크린샷 촬영 — 실기기 없이 만든다.
 *
 *   npm run dev            # 다른 터미널에서 먼저 띄운다 (5175)
 *   npm run shots          # ~/Downloads/rent-calc-upload/*.png (636×1048)
 *
 * 헤드리스 크롬을 CDP(Node 내장 WebSocket)로 직접 몰아 화면마다 상태를 만들고 찍는다.
 * 앱 코드는 건드리지 않는다 — 딥링크와 DOM 조작만 쓴다.
 *
 * 왜 이렇게 하나: net-pay 는 실기기 촬영본을 손으로 전처리했다(PLAYBOOK 6장). 그러면
 * 스크린샷을 얻으려고 번들 배포 → QR 테스트를 먼저 해야 해서 콘솔 등록이 두 번으로 쪼개진다.
 * 여기서는 개발 서버 화면을 그대로 찍어 그 의존을 없앤다. 실기기 확인은 QR 테스트에서 따로 한다.
 *
 * 두 가지를 지킨다.
 *  1) **컷은 요소 밑에서 끊는다.** 뷰포트 높이로 자르면 버튼·표가 반쯤 걸려 렌더링 오류처럼 보인다.
 *  2) **높이를 한 뷰포트로 통일하고 좌우에 흰 여백만 넣는다.** 세로를 잘라 비율을 맞추면 내용이 잘린다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const BASE = 'http://localhost:5175';
const OUT = process.argv[2] ?? `${process.env.HOME}/Downloads/rent-calc-upload`;
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
  '--user-data-dir=/tmp/rc-shots-profile',
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
window.__rc = {
  sleep: (ms) => new Promise(r => setTimeout(r, ms)),
  click(text) {
    const el = [...document.querySelectorAll('button, a')].find(b => b.textContent.trim().includes(text));
    if (!el) throw new Error('버튼 없음: ' + text);
    el.click();
  },
  setNth(sel, n, v) {
    const el = document.querySelectorAll(sel)[n];
    if (!el) throw new Error('입력 없음: ' + sel + '[' + n + ']');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  },
};
`;

const SHOTS = [
  {
    // 첫 장에 차별점(판정)이 보여야 한다. 날짜는 1년 넘은 값을 넣어 빈 칸으로 보이지 않게 한다
    file: '01-judge.png',
    url: '/j?m=renew&cd=100000000&cr=0&pd=50000000&pr=250000',
    after: 'await __rc.sleep(600); __rc.setNth(".date-input input", 0, "2024-09-01"); await __rc.sleep(400)',
    // 잠금 카드는 넣지 않는다 — 자리표시자(●●●)가 첫 장에 크게 들어가면 깨진 데이터로 읽힌다.
    // 시간축은 3번 장에서 해제 상태로 보여 준다
    cut: '.verdict',
  },
  {
    file: '02-detail.png',
    url: '/j?m=renew&cd=100000000&cr=0&pd=50000000&pr=250000',
    after: 'await __rc.sleep(600); __rc.click("산식 보기"); await __rc.sleep(500)',
    cut: '.hint',
  },
  {
    file: '03-timeline.png',
    url: '/j?m=renew&cd=100000000&cr=0&pd=50000000&pr=250000',
    unlock: true,
    after: 'await __rc.sleep(600); __rc.click("자세히"); await __rc.sleep(600)',
    cut: '.formula',
  },
  {
    file: '04-broker.png',
    url: '/j?m=renew&cd=100000000&cr=0&pd=10000000&pr=300000',
    after: 'await __rc.sleep(600); __rc.click("이 계약의 중개보수 상한"); await __rc.sleep(600)',
    cut: '.notes',
  },
  {
    file: '05-report.png',
    url: '/j?m=renew&cd=100000000&cr=0&pd=70000000&pr=350000',
    after: 'await __rc.sleep(600); __rc.click("신고 대상인가요"); await __rc.sleep(400); __rc.setNth(".date-input input", 0, "2026-09-01"); await __rc.sleep(600)',
    cut: '.notes',
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
  if (shot.unlock) {
    const mid = 'const d=new Date(); d.setHours(24,0,0,0); localStorage.setItem("rc.unlock", JSON.stringify({until:d.getTime()}));';
    await cdp.evalJs(mid);
  } else {
    await cdp.evalJs('localStorage.removeItem("rc.unlock")');
  }
  await cdp.send('Page.navigate', { url: BASE + shot.url });
  await sleep(1400);
  await cdp.evalJs(HELPERS);
  await cdp.evalJs(`(async () => { ${shot.after} })()`);
  // 하단 탭이 있는 화면은 뷰포트 전체를 찍는다. 탭바는 fixed 라 요소 기준으로 자르면
  // 알약이 반쯤 걸린다. 탭이 없는 화면(상세·시간축)만 요소 밑에서 끊는다.
  // 탭바가 있으면 **알약 바로 밑**에서 끊는다(net-pay 규칙). 뷰포트 끝까지 찍으면
  // 알약 아래로 다음 카드가 한 줄 비쳐 렌더링 오류처럼 보인다.
  const hasTabs = await cdp.evalJs('!!document.querySelector(".tabbar")');
  const height = hasTabs
    ? await cdp.evalJs(
        '(() => { const b = document.querySelector(".tabbar").getBoundingClientRect(); return Math.ceil(b.bottom + 6); })()',
      )
    : await cdp.evalJs(
    `(() => { const els=[...document.querySelectorAll(${JSON.stringify(shot.cut)})];
       const el = els[els.length-1];
       if (!el) throw new Error('컷 기준 요소 없음: ${shot.cut}');
       return Math.ceil(el.getBoundingClientRect().bottom + window.scrollY + 16); })()`,
  );
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: W, height, scale: 1 },
  });
  writeFileSync(`${OUT}/${shot.file}`, Buffer.from(data, 'base64'));
  console.log(`${shot.file} 촬영 — ${W}x${height} CSS px${hasTabs ? ' (탭바 포함)' : ''}`);
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
