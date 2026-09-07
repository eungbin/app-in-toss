import { createT } from '@ait/kit';
import ko from './ko.json';
import type { Timeframe } from '@/types';

export type CopyKey = keyof typeof ko;

/** 문구 조회. 구현은 @ait/kit createT — {name} 자리를 채운다. */
export const t = createT(ko);

/** 타임프레임에 맞는 진행 표시 — "Day 12 / 60", "12주 / 104", "12개월 / 120" */
export const progressLabel = (tf: Timeframe, n: number, total: number): string =>
  t(`play.progress.${tf}` as 'play.progress.day', { n, total });

export { ko };

/** 봉 번호 표기 — "Day 7", "7주", "7개월" */
export const barLabel = (tf: Timeframe, n: number): string =>
  tf === 'day' ? `Day ${n}` : tf === 'week' ? `${n}주` : `${n}개월`;

/** 차트 x축 눈금 접두어 — "Day ", "", "" */
export const barPrefix = (tf: Timeframe): string => (tf === 'day' ? 'Day ' : '');
