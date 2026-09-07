/**
 * 번들 데이터 진입점 — docs/FUNCTIONAL_SPEC.md §4
 * 앱은 런타임에 외부 데이터를 호출하지 않는다. 모든 표는 빌드 시 번들에 포함된다.
 */
import ratesJson from './rates.json';
import tablesJson from './tax-tables.json';
import type { RatesFile, TaxTableFile } from '@/types';

export const RATES = ratesJson as unknown as RatesFile;
/** effectiveFrom 오름차순 */
export const TAX_TABLES = tablesJson as unknown as TaxTableFile[];

/** 개발용 합성 세액표가 섞여 있는가 (프로덕션 빌드는 check:data가 차단한다) */
export const isDevData = TAX_TABLES.some((t) => t.meta.dev === true);

export interface TaxTablePick {
  table: TaxTableFile;
  /** 해당 시점의 표가 없어 현행 표로 대체했는가 */
  fallback: boolean;
}

/**
 * 기준일에 적용할 세액표.
 * 그 시점 이전 시행판이 없으면(데이터가 미치지 못하는 과거) 현행 표를 쓰고 fallback을 세운다.
 */
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
