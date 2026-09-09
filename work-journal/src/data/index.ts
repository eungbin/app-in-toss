/**
 * 번들 데이터 진입점 — docs/FUNCTIONAL_SPEC.md §4
 * 앱은 런타임에 외부 데이터를 호출하지 않는다. 모든 표는 빌드 시 번들에 들어간다.
 * rates.json·tax-tables.json 은 net-pay 와 같은 파일이다(복사). 갱신은 net-pay 가 먼저 한다.
 */
import ratesJson from './rates.json';
import tablesJson from './tax-tables.json';
import legalJson from './legal.json';
import type { LegalFile, RatesFile, TaxTableFile } from '@/types';

export const RATES = ratesJson as unknown as RatesFile;
/** effectiveFrom 오름차순 */
export const TAX_TABLES = tablesJson as unknown as TaxTableFile[];
export const LEGAL = legalJson as unknown as LegalFile;

export const isDevData = TAX_TABLES.some((t) => t.meta.dev === true);

export interface TaxTablePick {
  table: TaxTableFile;
  fallback: boolean;
}

export function taxTableFor(date: string, tables: TaxTableFile[] = TAX_TABLES): TaxTablePick {
  const newest = tables[tables.length - 1];
  if (!newest) throw new Error('tax-tables.json 이 비어 있습니다');

  let found: TaxTableFile | undefined;
  for (const t of tables) {
    if (t.meta.effectiveFrom <= date) found = t;
    else break;
  }
  return found ? { table: found, fallback: false } : { table: newest, fallback: true };
}

/** 그 해의 최저임금 시급. 해당 연도 행이 없으면 가장 최근 연도 값 */
export function minWageOf(year: number, legal: LegalFile = LEGAL): { hourly: number; year: number } {
  let pick = legal.minWage[0];
  for (const row of legal.minWage) if (row.year <= year) pick = row;
  if (!pick) throw new Error('legal.json 에 최저임금 행이 없습니다');
  return { hourly: pick.hourly, year: pick.year };
}
