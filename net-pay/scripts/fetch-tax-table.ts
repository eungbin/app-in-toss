/**
 * 간이세액표 원본 받기 — 공공데이터포털(국세청_근로소득 간이세액표).
 *   npm run data:fetch
 *
 * 원본은 소득세법 시행령 별표2를 담은 HWPX이고 라이선스는 "이용허락범위 제한 없음"이다.
 * 받은 파일은 data-src/tax-table/<시행일>.hwpx 로 저장한다(시행일은 파일명으로 관리).
 * 포털이 최신 시행판을 아직 올리지 않았으면 그 판은 직접 넣어야 한다(README 참고).
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAmendedOn, extractText } from './hwpx';

const OUT_DIR = resolve(import.meta.dirname, '../data-src/tax-table');
const DETAIL = 'https://www.data.go.kr/data/15050747/fileData.do';
const PUBLIC_DATA_PK = '15050747';
const PUBLIC_DATA_DETAIL_PK = 'uddi:f70a4df8-d316-4765-a895-efc96d6692e9';

/** 개정일 → 시행일. 국세청 안내 기준으로 알려진 것만 매핑하고, 모르면 개정일을 쓴다 */
const EFFECTIVE_FROM: Record<string, string> = {
  '2024-02-29': '2024-02-29',
  '2026-02-27': '2026-03-01',
};

async function main(): Promise<void> {
  const headers = { Referer: DETAIL, 'User-Agent': 'net-pay/data-fetch' };

  const infoUrl =
    `https://www.data.go.kr/tcs/dss/selectFileDataDownload.do` +
    `?publicDataPk=${PUBLIC_DATA_PK}&publicDataDetailPk=${encodeURIComponent(PUBLIC_DATA_DETAIL_PK)}&fileDetailSn=1`;
  const info = (await (await fetch(infoUrl, { headers })).json()) as {
    atchFileId?: string;
    fileDataRegistVO?: { orginlFileNm?: string; atchFileExtsn?: string };
  };
  const atchFileId = info.atchFileId;
  if (!atchFileId) throw new Error('포털에서 첨부파일 ID를 받지 못했습니다');

  const dlUrl = `https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=${atchFileId}&fileDetailSn=1`;
  const buf = Buffer.from(await (await fetch(dlUrl, { headers })).arrayBuffer());
  if (buf.length < 10_000) throw new Error(`받은 파일이 너무 작습니다 (${buf.length}바이트)`);

  const amendedOn = parseAmendedOn(extractText(buf));
  if (!amendedOn) throw new Error('원본에서 개정일을 읽지 못했습니다');
  const effectiveFrom = EFFECTIVE_FROM[amendedOn] ?? amendedOn;

  mkdirSync(OUT_DIR, { recursive: true });
  const out = resolve(OUT_DIR, `${effectiveFrom}.hwpx`);
  const existed = existsSync(out);
  writeFileSync(out, buf);
  console.log(
    `data-src/tax-table/${effectiveFrom}.hwpx — ${(buf.length / 1024).toFixed(0)}KB ` +
      `(개정 ${amendedOn}, ${info.fileDataRegistVO?.orginlFileNm ?? ''})${existed ? ' · 덮어씀' : ''}`,
  );
  console.log('다음: npm run data:build');
}

await main();
