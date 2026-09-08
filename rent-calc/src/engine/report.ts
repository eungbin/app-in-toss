/**
 * 임대차 신고 대상 판정 — docs/FUNCTIONAL_SPEC.md §3-6
 *
 * 부동산 거래신고 등에 관한 법률: 보증금 6천만 원 **초과** 또는 월세 30만 원 **초과**면
 * 계약 후 30일 안에 신고한다. 정확히 6천만 원·30만 원은 대상이 아니다.
 *
 * 지역 판정(군 지역 제외 등)은 v1.0 범위 밖이다. 화면에 각주를 붙인다.
 */
import { REPORT_DAYS, REPORT_DEPOSIT, REPORT_RENT } from '@/constants';
import type { ReportReason, ReportResult } from '@/types';

/** "YYYY-MM-DD" + n일 */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error(`날짜 형식이 잘못됐습니다: ${date}`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function reportRequired(
  deposit: number,
  rent: number,
  contractDate?: string,
  now: Date = new Date(),
): ReportResult {
  const reasons: ReportReason[] = [];
  if (deposit > REPORT_DEPOSIT) reasons.push('deposit');
  if (rent > REPORT_RENT) reasons.push('rent');

  const deadline = contractDate === undefined ? null : addDays(contractDate, REPORT_DAYS);
  const overdue =
    deadline === null ? false : new Date(`${deadline}T23:59:59`).getTime() < now.getTime();

  return { required: reasons.length > 0, reasons, deadline, overdue };
}
