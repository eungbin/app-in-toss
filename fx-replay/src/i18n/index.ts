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
