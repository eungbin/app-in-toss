import { describe, expect, it } from 'vitest';
import { CSV_BOM, buildCsv, csvFileName, utf8ToBase64 } from '../csv';
import { h, makeRecord, makeWorkplace } from './fixtures';

/** 테스트용 최소 CSV 파서 — 구현과 다른 경로로 되읽어 검증한다 */
function parseCsv(text: string): string[][] {
  const body = text.startsWith(CSV_BOM) ? text.slice(CSV_BOM.length) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (quoted) {
      if (c === '"' && body[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\r') {
      /* skip */
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const wp = makeWorkplace();

describe('CSV 내보내기 (US-4)', () => {
  it('BOM 으로 시작한다 — 엑셀에서 한글이 깨지지 않게', () => {
    expect(buildCsv([makeRecord()], [wp]).startsWith(CSV_BOM)).toBe(true);
  });

  it('헤더와 값을 그대로 되읽는다', () => {
    const csv = buildCsv([makeRecord()], [wp]);
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual([
      '날짜', '요일', '근무지', '출근', '퇴근', '휴게(분)', '실근무(분)',
      '야간(분)', '연장(분)', '휴일', '기본급', '가산', '추가수당', '일급', '메모',
    ]);
    expect(rows[1]).toEqual([
      '2026-09-09', '수', '카페 오후', '09:00', '18:00', '60', '480',
      '0', '0', 'N', '82560', '0', '0', '82560', '',
    ]);
  });

  it('쉼표·따옴표·줄바꿈이 있는 메모도 원복된다', () => {
    const memo = '마감, "야간" 근무\n비 옴';
    const rows = parseCsv(buildCsv([makeRecord({ memo })], [wp]));
    expect(rows[1]?.[14]).toBe(memo);
  });

  it('야간·휴일 기록의 분해값과 가산을 적는다', () => {
    const rows = parseCsv(buildCsv([makeRecord({ start: h(18), end: h(2) })], [wp]));
    const r = rows[1] as string[];
    expect(r[4]).toBe('02:00');
    expect(r[6]).toBe('420'); // 실근무
    expect(r[7]).toBe('180'); // 야간
    expect(r[11]).toBe('15480'); // 가산
  });

  it('날짜순으로 정렬한다', () => {
    const rows = parseCsv(
      buildCsv(
        [makeRecord({ id: 'b', date: '2026-09-09' }), makeRecord({ id: 'a', date: '2026-09-08' })],
        [wp],
      ),
    );
    expect(rows[1]?.[0]).toBe('2026-09-08');
    expect(rows[2]?.[0]).toBe('2026-09-09');
  });

  it('base64 로 바꿔도 바이트가 그대로다 — SDK 에 넘기는 값이 곧 파일이다', () => {
    const csv = buildCsv([makeRecord({ memo: '마감, "야간"' })], [wp]);
    const bytes = Uint8Array.from(atob(utf8ToBase64(csv)), (c) => c.charCodeAt(0));
    // UTF-8 BOM 은 EF BB BF. 기본 TextDecoder 는 이것을 떼어 내므로 ignoreBOM 으로 비교한다
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)).toBe(csv);
  });

  it('파일 이름에 날짜가 들어간다', () => {
    expect(csvFileName('2026-09-09')).toBe('근무수첩_20260909.csv');
  });
});
