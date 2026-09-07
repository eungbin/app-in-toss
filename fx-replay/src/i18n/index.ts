import ko from './ko.json';
import type { Timeframe } from '@/types';

type Key = keyof typeof ko;

/** 문구 조회. {name} 자리표시자를 치환한다. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  let s: string = ko[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

/** 타임프레임에 맞는 진행 표시 — "Day 12 / 60", "12주 / 104", "12개월 / 120" */
export const progressLabel = (tf: Timeframe, n: number, total: number): string =>
  t(`play.progress.${tf}` as 'play.progress.day', { n, total });
