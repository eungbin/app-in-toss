/**
 * 배지 — docs/FUNCTIONAL_SPEC.md §3-14 (US-5)
 * 결과 P·차이 P는 어떤 조건에도 쓰지 않는다(성과 보상 회피, PRD 원칙 C).
 */
import type { PlayResult, ReplayNote, Scenario } from '@/types';

export interface BadgeContext {
  /** 완료한 판 (최신순) */
  history: PlayResult[];
  notes: ReplayNote[];
  /** 전체 챕터 정의 */
  scenarios: Scenario[];
}

export interface BadgeDef {
  id: string;
  /** 미획득 상태에서 보여 줄 조건 안내 */
  hint: string;
  earned: (ctx: BadgeContext) => boolean;
}

const playedScenario = (ctx: BadgeContext, id: string) =>
  ctx.history.some((h) => h.scenarioId === id);

const dailyPlays = (ctx: BadgeContext) =>
  ctx.history.filter((h) => h.scenarioId.startsWith('daily:')).length;

export const BADGES: BadgeDef[] = [
  {
    id: 'first_reveal',
    hint: '첫 리빌',
    earned: (c) => c.history.length >= 1,
  },
  {
    id: 'through_1997',
    hint: '1997 외환위기 챕터 완료',
    earned: (c) => playedScenario(c, 'krw-1997-crisis'),
  },
  {
    id: 'through_2008',
    hint: '2008 글로벌 금융위기 챕터 완료',
    earned: (c) => playedScenario(c, 'krw-2008-gfc'),
  },
  {
    id: 'ten_plays',
    hint: '리빌 10회',
    earned: (c) => c.history.length >= 10,
  },
  {
    id: 'five_notes',
    hint: '복기 노트 5개',
    earned: (c) => c.notes.length >= 5,
  },
  {
    id: 'all_free',
    hint: '무료 챕터 전부 완료 + 오늘의 리플레이 30회',
    earned: (c) => {
      const free = c.scenarios.filter((s) => s.free);
      if (free.length === 0) return false;
      return free.every((s) => playedScenario(c, s.id)) && dailyPlays(c) >= 30;
    },
  },
];

/** 조건을 만족하는 배지 전체 */
export function evaluateBadges(ctx: BadgeContext): string[] {
  return BADGES.filter((b) => b.earned(ctx)).map((b) => b.id);
}

/** 아직 가지고 있지 않은 것만 */
export function newlyEarned(ctx: BadgeContext, owned: string[]): string[] {
  const have = new Set(owned);
  return evaluateBadges(ctx).filter((id) => !have.has(id));
}

export const badgeHint = (id: string): string =>
  BADGES.find((b) => b.id === id)?.hint ?? '';
