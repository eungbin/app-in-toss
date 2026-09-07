/**
 * 앱 상태 — docs/FUNCTIONAL_SPEC.md §3-1, §3-11
 * 단일 스토어. 모든 영속 값은 앱인토스 Storage에 즉시 저장한다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Badge,
  Entitlements,
  PlayResult,
  PlaySession,
  Profile,
  Quota,
  ReplayNote,
} from '@/types';
import { HISTORY_LIMIT, NOTE_LIMIT_FREE, NOTE_LIMIT_HARD, RECENT_SEGMENTS } from '@/constants';
import { KEY, readJson, writeJson } from '@/platform/storage';
import { loadProfile } from '@/platform/user';
import { emptyQuota, localDate, rollover } from '@/engine/quota';

export interface Settings {
  speed: 1 | 2;
  revealAnim: boolean;
  /** 챕터에서 사건이 있는 봉에 도달하면 자동으로 멈춘다 */
  pauseOnEvent: boolean;
}

export interface AppState {
  ready: boolean;
  loadError: boolean;
  profile: Profile | null;
  quota: Quota;
  session: PlaySession | null;
  history: PlayResult[];
  notes: ReplayNote[];
  badges: Badge[];
  entitlements: Entitlements;
  recentSegments: number[];
  settings: Settings;
}

const initial: AppState = {
  ready: false,
  loadError: false,
  profile: null,
  quota: emptyQuota(localDate()),
  session: null,
  history: [],
  notes: [],
  badges: [],
  entitlements: { premium: false, chapters: [], source: 'local' },
  recentSegments: [],
  settings: { speed: 1, revealAnim: true, pauseOnEvent: true },
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const profile = await loadProfile();
        const [quota, session, history, notes, badges, entitlements, recentSegments, settings] =
          await Promise.all([
            readJson<Quota>(KEY.quota, emptyQuota(localDate())),
            readJson<PlaySession | null>(KEY.session, null),
            readJson<PlayResult[]>(KEY.history, []),
            readJson<ReplayNote[]>(KEY.notes, []),
            readJson<Badge[]>(KEY.badges, []),
            readJson<Entitlements>(KEY.entitlements, initial.entitlements),
            readJson<number[]>(KEY.recentSegments, []),
            readJson<Partial<Settings>>(KEY.settings, {}),
          ]);
        if (!alive) return;
        const rolled = rollover(quota, localDate());
        if (rolled !== quota) void writeJson(KEY.quota, rolled);
        setState({
          ready: true,
          loadError: false,
          profile,
          quota: rolled,
          session,
          history,
          notes,
          badges,
          entitlements,
          recentSegments,
          // 저장본에 없는 키는 기본값으로 채운다(설정 추가 시 하위 호환)
          settings: { ...initial.settings, ...settings },
        });
      } catch {
        if (alive) setState((s) => ({ ...s, ready: true, loadError: true }));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setQuota = useCallback((q: Quota) => {
    setState((s) => ({ ...s, quota: q }));
    void writeJson(KEY.quota, q);
  }, []);

  const setSession = useCallback((sess: PlaySession | null) => {
    setState((s) => ({ ...s, session: sess }));
    void writeJson(KEY.session, sess);
  }, []);

  const pushRecentSegment = useCallback((idx: number, cleared: boolean) => {
    setState((s) => {
      const base = cleared ? [] : s.recentSegments;
      const next = [idx, ...base].slice(0, RECENT_SEGMENTS);
      void writeJson(KEY.recentSegments, next);
      return { ...s, recentSegments: next };
    });
  }, []);

  const addResult = useCallback((r: PlayResult) => {
    setState((s) => {
      const next = [r, ...s.history].slice(0, HISTORY_LIMIT);
      void writeJson(KEY.history, next);
      return { ...s, history: next };
    });
  }, []);

  const saveNote = useCallback((note: ReplayNote, dropOldest: boolean) => {
    setState((s) => {
      const limit = s.entitlements.premium ? NOTE_LIMIT_HARD : NOTE_LIMIT_FREE;
      let next = [note, ...s.notes];
      if (next.length > limit) next = dropOldest ? next.slice(0, limit) : s.notes;
      void writeJson(KEY.notes, next);
      return { ...s, notes: next };
    });
  }, []);

  const updateNote = useCallback((id: string, memo: string) => {
    setState((s) => {
      const next = s.notes.map((n) => (n.id === id ? { ...n, memo } : n));
      void writeJson(KEY.notes, next);
      return { ...s, notes: next };
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setState((s) => {
      const next = s.notes.filter((n) => n.id !== id);
      void writeJson(KEY.notes, next);
      return { ...s, notes: next };
    });
  }, []);

  const earnBadges = useCallback((ids: string[]) => {
    setState((s) => {
      const have = new Set(s.badges.map((b) => b.id));
      const fresh = ids.filter((id) => !have.has(id));
      if (fresh.length === 0) return s;
      const next = [...s.badges, ...fresh.map((id) => ({ id, earnedAt: new Date().toISOString() }))];
      void writeJson(KEY.badges, next);
      return { ...s, badges: next };
    });
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => {
      const next = { ...s.settings, ...patch };
      void writeJson(KEY.settings, next);
      return { ...s, settings: next };
    });
  }, []);

  const clearAll = useCallback(async () => {
    await Promise.all([
      writeJson(KEY.history, []),
      writeJson(KEY.notes, []),
      writeJson(KEY.badges, []),
      writeJson(KEY.session, null),
      writeJson(KEY.recentSegments, []),
    ]);
    setState((s) => ({ ...s, history: [], notes: [], badges: [], session: null, recentSegments: [] }));
  }, []);

  return {
    state,
    stateRef,
    setQuota,
    setSession,
    pushRecentSegment,
    addResult,
    saveNote,
    updateNote,
    deleteNote,
    earnBadges,
    setSettings,
    clearAll,
  };
}

export type Store = ReturnType<typeof useAppStore>;
