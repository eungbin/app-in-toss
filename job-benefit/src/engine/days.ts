/** 소정급여일수 — 고용보험법 별표 1 (§3-5) */
import table from '../data/benefit-days.json';
import type { InsuredBand } from '../types';

const ORDER: InsuredBand[] = ['lt1', 'y1to3', 'y3to5', 'y5to10', 'gte10'];

export function benefitDays(treatedAs50plus: boolean, band: InsuredBand): number {
  const i = ORDER.indexOf(band);
  if (i < 0) throw new Error(`알 수 없는 피보험기간 구간: ${band}`);
  const row = treatedAs50plus ? table.from50 : table.under50;
  const v = row[i];
  if (v === undefined) throw new Error(`별표 1 표에서 ${band} 값을 찾지 못했습니다`);
  return v;
}
