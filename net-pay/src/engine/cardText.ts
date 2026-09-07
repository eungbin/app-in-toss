/**
 * 협상 카드 문구 — docs/SCREEN_FLOW.md S05, 기능 명세 §3-10
 * 연봉 숨김이 켜지면 이미지와 공유 텍스트 어디에도 연봉·공제 금액이 남지 않아야 한다.
 */
import { manwon } from './format';
import { t } from '@/i18n';

export interface CardArgs {
  /** 월 실수령 (원) */
  netMonthly: number;
  /** 연봉 (원) */
  annualGross: number;
  /** 월 공제 합계 (원) */
  deductions: number;
  year: string;
  hideGross: boolean;
}

/** 카드에 그릴 줄. 첫 줄이 헤드라인 */
export function cardLines(a: CardArgs): string[] {
  const lines = [t('card.headline', { net: manwon(a.netMonthly) })];
  if (!a.hideGross) {
    lines.push(t('card.line.gross', { gross: manwon(a.annualGross) }));
    lines.push(t('card.line.meta', { year: a.year, ded: manwon(a.deductions) }));
  }
  return lines;
}

/** 공유 시트에 넣을 텍스트 */
export function cardShareText(a: CardArgs): string {
  return a.hideGross
    ? t('card.share.textHidden', { net: manwon(a.netMonthly) })
    : t('card.share.text', { net: manwon(a.netMonthly), gross: manwon(a.annualGross) });
}

export interface TimelineCardArgs {
  headline: string;
  rows: { label: string; value: number }[];
}
