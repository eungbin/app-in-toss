/**
 * 번들 데이터 검증 — docs/FUNCTIONAL_SPEC.md §4-5
 * 컷오프·무결성·시나리오 구간을 CI에서 단정한다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Scenario, SeriesFile } from '../src/types';
import { CUTOFF_MONTHS } from '../src/constants';
import { resolveRange } from '../src/engine/scenario';
import { resample } from '../src/engine/resample';
import { candleHigh, candleLow } from '../src/engine/normalize';
import { cutoffDate } from './ecos';

const ROOT = resolve(import.meta.dirname, '..');
const load = <T>(p: string): T => JSON.parse(readFileSync(resolve(ROOT, p), 'utf-8')) as T;

const seriesIds = ['usdkrw', 'cnykrw'] as const;
const allSeries = seriesIds.map((id) => load<SeriesFile>(`src/data/series/${id}.json`));
const scenarios = readdirSync(resolve(ROOT, 'src/data/scenarios'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => load<Scenario>(`src/data/scenarios/${f}`));

describe('시세 데이터', () => {
  for (const s of allSeries) {
    describe(s.id, () => {
      it('컷오프 이후 데이터가 없다', () => {
        const last = s.candles[s.candles.length - 1];
        expect(last).toBeDefined();
        expect(last!.d <= s.source.cutoff).toBe(true);
        for (const c of s.candles) expect(c.d <= s.source.cutoff).toBe(true);
      });

      it('컷오프가 오늘 기준 12개월 이전이다', () => {
        // 데이터 파일이 오래됐을 수 있으므로 "12개월보다 최신이 아님"만 단정한다
        expect(s.source.cutoff <= cutoffDate(CUTOFF_MONTHS)).toBe(true);
      });

      it('한국은행이 작성한 통계만 쓴다', () => {
        expect(s.source.org).toBe('한국은행');
        expect(['731Y003', '722Y001']).toContain(s.source.stat);
      });

      it('날짜가 오름차순이고 중복이 없다', () => {
        for (let i = 1; i < s.candles.length; i++) {
          expect(s.candles[i]!.d > s.candles[i - 1]!.d).toBe(true);
        }
      });

      it('모든 값이 양수다', () => {
        for (const c of s.candles) {
          for (const v of [c.o, c.h, c.l, c.c]) expect(v).toBeGreaterThan(0);
        }
      });

      it('고가·저가가 어긋난 행이 극소수다', () => {
        // ECOS는 시·고·저·종을 별도 항목으로 발행하고 종가는 15:30 기준이라
        // 드물게 서로 어긋난다. 원자료는 고치지 않고 표시 단계에서 보정한다.
        const off = s.candles.filter(
          (c) => c.h < Math.max(c.o, c.c) - 1e-9 || c.l > Math.min(c.o, c.c) + 1e-9,
        );
        expect(off.length / s.candles.length).toBeLessThan(0.01);
      });

      it('표시 보정을 거치면 캔들 기하가 항상 유효하다', () => {
        for (const c of s.candles) {
          expect(candleLow(c)).toBeLessThanOrEqual(Math.min(c.o, c.c) + 1e-9);
          expect(candleHigh(c)).toBeGreaterThanOrEqual(Math.max(c.o, c.c) - 1e-9);
          expect(candleHigh(c)).toBeGreaterThanOrEqual(candleLow(c));
        }
      });

      it('YYYYMMDD 형식', () => {
        for (const c of s.candles) expect(c.d).toMatch(/^\d{8}$/);
      });
    });
  }

  it('usdkrw는 8,000행 이상', () => {
    const usd = allSeries.find((s) => s.id === 'usdkrw')!;
    expect(usd.candles.length).toBeGreaterThanOrEqual(8000);
  });
});

describe('시나리오', () => {
  it('ID가 중복되지 않는다', () => {
    const ids = scenarios.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const sc of scenarios) {
    describe(sc.id, () => {
      it('구간이 시계열 안에 존재한다', () => {
        const series = allSeries.find((s) => s.id === sc.series);
        expect(series).toBeDefined();
        const candles = resample(series!.candles, sc.timeframe ?? 'day');
        const range = resolveRange(candles, sc);
        expect(range).not.toBeNull();
        expect(range!.endDate >= sc.start).toBe(true);
      });

      it('유료 챕터에는 상품 ID가 있다', () => {
        if (sc.free) expect(sc.productId).toBeUndefined();
        else expect(sc.productId).toBe(`chapter.${sc.id}`);
      });

      it('소개와 해설이 비어 있지 않다', () => {
        expect(sc.intro.length).toBeGreaterThan(0);
        expect(sc.debrief.length).toBeGreaterThan(0);
      });
    });
  }

  it('무료 챕터가 하나 이상 있다', () => {
    expect(scenarios.some((s) => s.free)).toBe(true);
  });
});
