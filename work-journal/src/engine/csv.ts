/**
 * CSV 내보내기 (US-4) — docs/FUNCTIONAL_SPEC.md §3-13
 *
 * SDK 3.x 의 File.saveBase64 가 임의 MIME 을 받으므로 text/csv 로 기기에 저장한다.
 * 엑셀이 한글을 깨지 않게 UTF-8 BOM 을 붙인다.
 * 잠긴 근무지의 기록도 포함한다 — 사용자 데이터를 게이트로 잠그지 않는다.
 */
import type { WorkRecord, Workplace } from '@/types';
import { dayPay } from './pay';
import { splitShift } from './shift';
import { dowLabel, hhmm } from './date';

export const CSV_BOM = '﻿';

export const CSV_HEADER = [
  '날짜',
  '요일',
  '근무지',
  '출근',
  '퇴근',
  '휴게(분)',
  '실근무(분)',
  '야간(분)',
  '연장(분)',
  '휴일',
  '기본급',
  '가산',
  '추가수당',
  '일급',
  '메모',
] as const;

/** 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싸고 내부 따옴표를 두 번 쓴다 (RFC 4180) */
export function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRows(records: WorkRecord[], workplaces: Workplace[]): string[][] {
  const nameOf = new Map(workplaces.map((w) => [w.id, w.name]));
  const wpOf = new Map(workplaces.map((w) => [w.id, w]));
  const sorted = [...records].sort((a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1));

  return sorted.map((r) => {
    const wp = wpOf.get(r.workplaceId);
    const split = splitShift(r);
    const pay = wp ? dayPay(split, r, wp) : { base: 0, overtimePay: 0, nightPay: 0, holidayPay: 0, extra: r.extraPay, total: r.extraPay };
    return [
      r.date,
      dowLabel(r.date),
      nameOf.get(r.workplaceId) ?? '',
      hhmm(r.start),
      hhmm(r.end),
      String(r.breakMin),
      String(split.work),
      String(split.night),
      String(split.overtime),
      r.holiday ? 'Y' : 'N',
      String(pay.base),
      String(pay.overtimePay + pay.nightPay + pay.holidayPay),
      String(pay.extra),
      String(pay.total),
      r.memo,
    ];
  });
}

export function buildCsv(records: WorkRecord[], workplaces: Workplace[]): string {
  const lines = [CSV_HEADER.map(csvCell).join(',')];
  for (const row of csvRows(records, workplaces)) lines.push(row.map(csvCell).join(','));
  return CSV_BOM + lines.join('\r\n') + '\r\n';
}

export function csvFileName(today: string): string {
  return `근무수첩_${today.replace(/-/g, '')}.csv`;
}

/**
 * UTF-8 문자열을 base64 로 바꾼다.
 * `btoa` 는 Latin-1 만 받으므로 한글이 있으면 그대로 넣을 수 없다.
 * SDK File.saveBase64 는 헤더 없는 순수 base64 를 받는다.
 */
export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i] as number);
  return btoa(bin);
}
