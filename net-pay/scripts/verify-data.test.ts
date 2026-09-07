/** 번들 데이터 무결성 — docs/FUNCTIONAL_SPEC.md §6 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RatesFile, TaxTableFile } from '../src/types';

const ROOT = resolve(import.meta.dirname, '..');
const read = <T>(p: string): T => JSON.parse(readFileSync(resolve(ROOT, p), 'utf-8')) as T;

const rates = read<RatesFile>('src/data/rates.json');
const tables = read<TaxTableFile[]>('src/data/tax-tables.json');

describe('요율 데이터', () => {
  it('from 오름차순이고 중복이 없다', () => {
    const froms = rates.map((r) => r.from);
    expect([...froms].sort()).toEqual(froms);
    expect(new Set(froms).size).toBe(froms.length);
  });

  it('시간축 시작 연도부터 올해까지 빠진 연도가 없다', () => {
    const years = new Set(rates.map((r) => Number(r.from.slice(0, 4))));
    for (let y = 2021; y <= new Date().getFullYear(); y++) {
      expect(years.has(y), `${y}년 요율 행이 없다`).toBe(true);
    }
  });

  it('요율은 상식적인 범위 안에 있다', () => {
    for (const r of rates) {
      expect(r.nps.totalRate).toBeGreaterThan(0.05);
      expect(r.nps.totalRate).toBeLessThan(0.2);
      expect(r.nhis.totalRate).toBeGreaterThan(0.05);
      expect(r.nhis.totalRate).toBeLessThan(0.15);
      expect(r.nhis.ltcRateOnPremium).toBeGreaterThan(0.05);
      expect(r.nhis.ltcRateOnPremium).toBeLessThan(0.25);
      expect(r.ei.totalRate).toBeGreaterThan(0);
      expect(r.ei.totalRate).toBeLessThan(0.05);
      expect(r.nps.baseMin).toBeLessThan(r.nps.baseMax);
    }
  });

  it('요율과 상·하한은 시간이 지나며 내려가지 않는다', () => {
    for (let i = 1; i < rates.length; i++) {
      const prev = rates[i - 1]!;
      const cur = rates[i]!;
      expect(cur.nps.baseMax).toBeGreaterThanOrEqual(prev.nps.baseMax);
      expect(cur.nps.baseMin).toBeGreaterThanOrEqual(prev.nps.baseMin);
    }
  });

  it('2026년 확정값이 들어 있다', () => {
    const jul = rates.find((r) => r.from === '2026-07-01');
    expect(jul).toBeDefined();
    expect(jul!.nps.totalRate).toBe(0.095);
    expect(jul!.nps.baseMin).toBe(410_000);
    expect(jul!.nps.baseMax).toBe(6_590_000);
    expect(jul!.nhis.totalRate).toBe(0.0719);
    expect(jul!.nhis.ltcRateOnPremium).toBe(0.1314);
    expect(jul!.ei.totalRate).toBe(0.009);
  });

  it('모든 행에 출처가 붙어 있다', () => {
    for (const r of rates) {
      expect(r.sources.length, `${r.from} 행에 출처가 없다`).toBeGreaterThan(0);
      for (const s of r.sources) {
        expect(s.url).toMatch(/^https:\/\//);
        expect(s.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

describe('간이세액표 데이터', () => {
  it('시행일 오름차순이다', () => {
    const froms = tables.map((t) => t.meta.effectiveFrom);
    expect([...froms].sort()).toEqual(froms);
  });

  it('구간이 끊기지 않고 열은 11개다', () => {
    for (const t of tables) {
      expect(t.brackets.length).toBeGreaterThan(0);
      t.brackets.forEach((b, i) => {
        expect(b.tax).toHaveLength(11);
        expect(b.hi).toBeGreaterThan(b.lo);
        const prev = t.brackets[i - 1];
        if (prev) expect(b.lo).toBe(prev.hi);
      });
    }
  });

  it('같은 열에서 급여가 오르면 세액이 줄지 않는다', () => {
    for (const t of tables) {
      for (let i = 1; i < t.brackets.length; i++) {
        const prev = t.brackets[i - 1]!;
        const cur = t.brackets[i]!;
        for (let c = 0; c < 11; c++) {
          expect(cur.tax[c]!, `${t.meta.effectiveFrom} ${cur.lo}원 ${c + 1}열`).toBeGreaterThanOrEqual(prev.tax[c]!);
        }
      }
    }
  });

  it('같은 구간에서 가족 수가 늘면 세액이 늘지 않는다', () => {
    for (const t of tables) {
      for (const b of t.brackets) {
        for (let c = 1; c < 11; c++) {
          expect(b.tax[c]!, `${t.meta.effectiveFrom} ${b.lo}원`).toBeLessThanOrEqual(b.tax[c - 1]!);
        }
      }
    }
  });

  it('자녀 차감액은 2026-03-01 시행 개정값을 쓴다', () => {
    for (const t of tables) {
      if (t.meta.effectiveFrom < '2026-03-01') continue;
      expect(t.childDeduction).toEqual({ one: 20_830, two: 45_830, extraPerChild: 33_330 });
    }
  });

  it('표 상한 초과 산식의 구간이 이어진다', () => {
    for (const t of tables) {
      const segs = t.overCap.segments;
      expect(segs.length).toBeGreaterThan(0);
      segs.forEach((s, i) => {
        const prev = segs[i - 1];
        if (prev) expect(s.from).toBe(prev.to);
        expect(s.rate).toBeGreaterThan(0);
        expect(s.factor).toBeGreaterThan(0);
        expect(s.factor).toBeLessThanOrEqual(1);
      });
      expect(segs[segs.length - 1]!.to).toBeNull();
      expect(segs[0]!.from).toBe(t.brackets[t.brackets.length - 1]!.hi);
    }
  });
});
