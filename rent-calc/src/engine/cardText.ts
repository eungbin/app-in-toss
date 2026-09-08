/**
 * 판정 카드 문구 — 순수 함수. 그리기는 card.ts 가 한다.
 * 문구는 문구 린트 대상이므로 여기서 조립하고 테스트로 고정한다.
 */
import type { JudgeResult, TimelineRow } from '@/types';
import { manwon, percent, percentShort, won } from './format';
import { t } from '@/i18n';

export interface CardArgs {
  result: JudgeResult;
  proposedDeposit: number;
  proposedRent: number;
  /** 보증금 숨기기 */
  hideDeposit: boolean;
}

const MASK = '●●●●';

/** 카드 본문 줄. 첫 줄이 헤드라인 */
export function cardLines(a: CardArgs): string[] {
  const { result } = a;
  const head =
    result.verdict === 'within'
      ? t('card.within')
      : t('card.exceeds', { excess: won(result.excessAsRent) });

  return [
    head,
    t('card.line.terms', {
      pd: a.hideDeposit ? MASK : manwon(a.proposedDeposit),
      pr: manwon(a.proposedRent),
      inc: percent(result.increase),
    }),
    t('card.line.rate', {
      br: percentShort(result.baseRate),
      rate: percentShort(result.legalRate),
    }),
  ];
}

export interface TimelineCardArgs {
  rows: TimelineRow[];
  deposit: number;
  hideDeposit: boolean;
}

export function timelineCardLines(a: TimelineCardArgs): string[] {
  const first = a.rows[0];
  const last = a.rows[a.rows.length - 1];
  if (first === undefined || last === undefined) return [t('timeline.card.title')];
  return [
    t('timeline.card.title'),
    t('timeline.sub', { d: a.hideDeposit ? MASK : won(a.deposit) }),
    t('timeline.headline', {
      r0: percentShort(first.baseRate),
      r1: percentShort(last.baseRate),
      delta: won(Math.abs(last.maxRent - first.maxRent)),
    }),
  ];
}

/** 링크 공유 텍스트 */
export function shareText(a: CardArgs): string {
  const [head] = cardLines(a);
  return `${head ?? ''} · ${t('card.disclaimer')}`;
}
