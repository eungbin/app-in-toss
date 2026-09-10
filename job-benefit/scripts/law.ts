/**
 * 국가법령정보센터 수집 유틸.
 *
 * 두 경로를 쓴다.
 *   별표 — `lsBylTextDownLoad.do` 로 **평문**을 받는다 (net-pay 에서 굳은 흐름).
 *   조문 — 겉 페이지는 iframe + JS 라 빈 껍데기지만, **그 iframe 주소(`lsSideInfoP.do`)를
 *          직접 부르면 서버가 조문 HTML 을 준다.** (job-benefit 2026-09-10 확인,
 *          docs/DATA_VERIFICATION.md 1-2)
 *
 * 법령·고시는 저작권 보호 대상이 아니다(저작권법 제7조 제1호).
 */
const BASE = 'https://www.law.go.kr';
const UA = 'Mozilla/5.0 (compatible; job-benefit data-fetch)';

/** 한글이 든 URL 을 헤더 값으로 쓰면 fetch 가 던진다 — 헤더는 자동 인코딩되지 않는다 */
export const lawPage = (name: string): string => encodeURI(`${BASE}/법령/${name}`);

async function get(url: string, referer?: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...(referer ? { Referer: referer } : {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

/** 법령 일련번호 */
export async function lsiSeq(lawName: string): Promise<string> {
  const page = lawPage(lawName);
  const seq = /lsInfoP\.do\?lsiSeq=(\d+)/.exec(await get(page))?.[1];
  if (!seq) throw new Error(`법령 일련번호를 찾지 못했습니다: ${lawName}`);
  return seq;
}

/** 별표 평문. bylNo 는 4자리('0001') */
export async function bylText(lawName: string, bylNo: string): Promise<{ text: string; bylSeq: string }> {
  const seq = await lsiSeq(lawName);
  const linkUrl = `${BASE}/LSW/lsBylInfoPLinkR.do?lsiSeq=${seq}&bylNo=${bylNo}&bylBrNo=00&bylCls=BE&bylEfYd=&bylEfYdYn=Y`;
  const link = await get(linkUrl, lawPage(lawName));
  const bylSeq = /id="bylSeq"[^>]*value="(\d+)"/.exec(link)?.[1];
  const title = /<title>[^>]*?&gt;\s*([^|]+?)\s*\|/.exec(link)?.[1]?.trim() ?? '';
  if (!bylSeq) throw new Error(`별표 일련번호를 찾지 못했습니다: ${lawName} 별표 ${bylNo}`);
  const res = await fetch(`${BASE}/LSW/lsBylTextDownLoad.do`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Referer: linkUrl,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: new URLSearchParams({ bylSeq, title, mode: '0' }),
  });
  if (!res.ok) throw new Error(`${res.status} lsBylTextDownLoad.do`);
  return { text: await res.text(), bylSeq };
}

const strip = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/(p|div|tr)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ');

/** 조문 본문. joNo 는 4자리('0045'), joBrNo 는 2자리 가지번호('00', 제91조의2 는 '02') */
export async function joText(lawName: string, joNo: string, joBrNo = '00'): Promise<string> {
  const seq = await lsiSeq(lawName);
  const url = `${BASE}/LSW//lsSideInfoP.do?lsiSeq=${seq}&joNo=${joNo}&joBrNo=${joBrNo}&docCls=jo&urlMode=lsScJoRltInfoR`;
  return strip(await get(url, lawPage(lawName)));
}

/** 원문 대조용 — 공백을 모두 지운 뒤 포함 여부를 본다.
 *  평문 표는 글자마다 줄바꿈이 들어와 공백을 남기면 대조가 어긋난다. */
export const squeeze = (s: string): string => s.replace(/\s+/g, '');

/** 개정일 "<개정 2019. 8. 27.>" → "2019-08-27" */
export function parseAmendedOn(text: string): string | null {
  const m = /개정\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./.exec(text);
  if (!m) return null;
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}
