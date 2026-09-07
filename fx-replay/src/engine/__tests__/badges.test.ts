import { describe, expect, it } from 'vitest';
import { BADGES, evaluateBadges, newlyEarned } from '../badges';
import type { PlayResult, ReplayNote, Scenario } from '@/types';

const result = (scenarioId: string, diffP = 0): PlayResult => ({
  sessionId: `s-${scenarioId}-${Math.random()}`,
  scenarioId,
  series: 'usdkrw',
  startDate: '20080901',
  endDate: '20081127',
  finalP: 1_000_000 + diffP,
  benchmarkP: 1_000_000,
  diffP,
  conversions: [],
  completedAt: '2026-09-07T00:00:00.000Z',
});

const note = (): ReplayNote => ({
  id: String(Math.random()),
  result: result('daily:usdkrw:1'),
  memo: '',
  createdAt: '2026-09-07T00:00:00.000Z',
});

const scenarios = [
  { id: 'krw-2005-strong', free: true },
  { id: 'krw-1997-crisis', free: false },
  { id: 'krw-2008-gfc', free: false },
] as Scenario[];

const ctx = (history: PlayResult[] = [], notes: ReplayNote[] = []) => ({
  history,
  notes,
  scenarios,
});

describe('badges', () => {
  it('아무것도 안 했으면 배지가 없다', () => {
    expect(evaluateBadges(ctx())).toEqual([]);
  });

  it('첫 리빌', () => {
    expect(evaluateBadges(ctx([result('daily:usdkrw:1')]))).toContain('first_reveal');
  });

  it('특정 챕터를 완료해야 해당 배지를 받는다', () => {
    expect(evaluateBadges(ctx([result('krw-1997-crisis')]))).toContain('through_1997');
    expect(evaluateBadges(ctx([result('krw-1997-crisis')]))).not.toContain('through_2008');
    expect(evaluateBadges(ctx([result('krw-2008-gfc')]))).toContain('through_2008');
  });

  it('리빌 10회', () => {
    const nine = Array.from({ length: 9 }, () => result('daily:usdkrw:1'));
    expect(evaluateBadges(ctx(nine))).not.toContain('ten_plays');
    expect(evaluateBadges(ctx([...nine, result('daily:usdkrw:2')]))).toContain('ten_plays');
  });

  it('노트 5개', () => {
    const four = Array.from({ length: 4 }, note);
    expect(evaluateBadges(ctx([], four))).not.toContain('five_notes');
    expect(evaluateBadges(ctx([], [...four, note()]))).toContain('five_notes');
  });

  it('all_free는 무료 챕터 전부 + 오늘의 리플레이 30회', () => {
    const daily30 = Array.from({ length: 30 }, (_, i) => result(`daily:usdkrw:${i}`));
    expect(evaluateBadges(ctx(daily30))).not.toContain('all_free');
    expect(evaluateBadges(ctx([result('krw-2005-strong')]))).not.toContain('all_free');
    expect(evaluateBadges(ctx([...daily30, result('krw-2005-strong')]))).toContain('all_free');
  });

  it('무료 챕터가 없으면 all_free를 주지 않는다', () => {
    const daily30 = Array.from({ length: 30 }, (_, i) => result(`daily:usdkrw:${i}`));
    const noFree = { history: daily30, notes: [], scenarios: [] as Scenario[] };
    expect(evaluateBadges(noFree)).not.toContain('all_free');
  });

  it('이미 가진 배지는 새로 주지 않는다', () => {
    const c = ctx([result('krw-1997-crisis')]);
    expect(newlyEarned(c, [])).toEqual(['first_reveal', 'through_1997']);
    expect(newlyEarned(c, ['first_reveal'])).toEqual(['through_1997']);
    expect(newlyEarned(c, ['first_reveal', 'through_1997'])).toEqual([]);
  });

  it('결과 P는 어떤 조건에도 영향을 주지 않는다', () => {
    const win = ctx([result('daily:usdkrw:1', 500_000)]);
    const lose = ctx([result('daily:usdkrw:1', -500_000)]);
    expect(evaluateBadges(win)).toEqual(evaluateBadges(lose));
  });

  it('모든 배지에 안내 문구가 있다', () => {
    for (const b of BADGES) expect(b.hint.length).toBeGreaterThan(0);
  });
});
