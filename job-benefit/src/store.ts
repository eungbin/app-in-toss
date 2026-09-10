/**
 * 앱 상태 — docs/FUNCTIONAL_SPEC.md §1
 *
 * 영속 값은 앱인토스 Storage 에만 둔다(localStorage·IndexedDB 금지).
 * 서버·계정은 없다. 저장하는 것은 셋뿐이다 — 해제 기한, 저장한 계산, 설정.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createStore, loadAnonProfile, type AnonProfile } from '@ait/kit';
import { SCHEMA_VERSION } from '@/constants';
import type { Input } from '@/types';

const store = createStore('jb');

export const KEY = {
  profile: store.key('profile'),
  unlock: store.key('unlock'),
  saved: store.key('saved'),
  settings: store.key('settings'),
} as const;

export interface SavedCalc {
  id: string;
  name: string;
  input: Input;
  savedAt: string;
}

export interface Settings {
  /** 공유 카드에서 금액을 숨긴다. 기본 켜짐 — 남에게 보내는 카드에 임금이 들어가지 않게 */
  cardHideMoney: boolean;
  schema: number;
}

const defaultSettings: Settings = { cardHideMoney: true, schema: SCHEMA_VERSION };

export interface AppState {
  ready: boolean;
  profile: AnonProfile | null;
  /** 해제 기한(ms). null 이면 잠김 */
  unlockedUntil: number | null;
  saved: SavedCalc[];
  settings: Settings;
}

const initial: AppState = {
  ready: false,
  profile: null,
  unlockedUntil: null,
  saved: [],
  settings: defaultSettings,
};

/** 기기 로컬 다음 자정 */
export function nextMidnight(now = new Date()): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

export const isUnlocked = (until: number | null, now = Date.now()): boolean => until !== null && until > now;

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function useAppStore() {
  const [state, setState] = useState<AppState>(initial);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      const [profile, unlock, saved, settings] = await Promise.all([
        loadAnonProfile(store, KEY.profile, SCHEMA_VERSION),
        store.readJson<{ until: number | null }>(KEY.unlock, { until: null }),
        store.readJson<SavedCalc[]>(KEY.saved, []),
        store.readJson<Settings>(KEY.settings, defaultSettings),
      ]);
      if (!mounted.current) return;
      setState({
        ready: true,
        profile,
        unlockedUntil: unlock.until,
        saved,
        settings: { ...defaultSettings, ...settings },
      });
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  const openGate = useCallback(() => {
    const until = nextMidnight();
    setState((s) => ({ ...s, unlockedUntil: until }));
    void store.writeJson(KEY.unlock, { until });
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => {
      const next = { ...s.settings, ...patch };
      void store.writeJson(KEY.settings, next);
      return { ...s, settings: next };
    });
  }, []);

  const save = useCallback((calc: SavedCalc) => {
    setState((s) => {
      const next = [calc, ...s.saved.filter((x) => x.id !== calc.id)];
      void store.writeJson(KEY.saved, next);
      return { ...s, saved: next };
    });
  }, []);

  const remove = useCallback((id: string) => {
    setState((s) => {
      const next = s.saved.filter((x) => x.id !== id);
      void store.writeJson(KEY.saved, next);
      return { ...s, saved: next };
    });
  }, []);

  const clearAll = useCallback(async () => {
    await Promise.all([store.remove(KEY.saved), store.remove(KEY.unlock), store.remove(KEY.settings)]);
    setState((s) => ({ ...s, saved: [], unlockedUntil: null, settings: defaultSettings }));
  }, []);

  return { state, openGate, setSettings, save, remove, clearAll };
}
