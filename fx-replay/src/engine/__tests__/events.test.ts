import { describe, expect, it } from 'vitest';
import { mapEventsToBars } from '../events';
import type { Candle, ScenarioEvent } from '@/types';

const day = (d: string): Candle => ({ d, o: 1, h: 1, l: 1, c: 1 });
const week = (d: string, de: string): Candle => ({ d, de, o: 1, h: 1, l: 1, c: 1 });
const ev = (d: string, label: string): ScenarioEvent => ({ d, label, body: '' });

describe('mapEventsToBars', () => {
  const daily = [day('20080912'), day('20080916'), day('20080917'), day('20080918')];

  it('거래일 사건은 그날 봉에 붙는다', () => {
    const m = mapEventsToBars(daily, 0, 4, [ev('20080917', 'A')]);
    expect(m.get(3)?.[0]?.label).toBe('A');
    expect(m.size).toBe(1);
  });

  it('휴장일 사건은 다음 거래일 봉에 붙는다', () => {
    // 2008-09-15 는 추석 휴장 → 다음 거래일 09-16 봉
    const m = mapEventsToBars(daily, 0, 4, [ev('20080915', '리먼')]);
    expect(m.get(2)?.[0]?.label).toBe('리먼');
  });

  it('같은 봉의 사건은 함께 묶인다', () => {
    const m = mapEventsToBars(daily, 0, 4, [ev('20080917', 'A'), ev('20080917', 'B')]);
    expect(m.get(3)?.map((e) => e.label)).toEqual(['A', 'B']);
  });

  it('구간 시작 전 사건은 무시한다', () => {
    expect(mapEventsToBars(daily, 0, 4, [ev('20080901', '이전')]).size).toBe(0);
  });

  it('구간을 벗어난 사건은 무시한다', () => {
    expect(mapEventsToBars(daily, 0, 2, [ev('20080918', '이후')]).size).toBe(0);
  });

  it('주봉은 사건이 속한 주의 봉에 붙는다', () => {
    const weeks = [week('20200309', '20200313'), week('20200316', '20200320')];
    const m = mapEventsToBars(weeks, 0, 2, [ev('20200311', 'WHO'), ev('20200319', '스와프')]);
    expect(m.get(1)?.[0]?.label).toBe('WHO');
    expect(m.get(2)?.[0]?.label).toBe('스와프');
  });

  it('startIdx 가 0 이 아니어도 봉 번호는 1부터', () => {
    const m = mapEventsToBars(daily, 2, 2, [ev('20080918', 'A')]);
    expect(m.get(2)?.[0]?.label).toBe('A');
  });

  it('사건이 없으면 빈 맵', () => {
    expect(mapEventsToBars(daily, 0, 4, []).size).toBe(0);
  });
});
