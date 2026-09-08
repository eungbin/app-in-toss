/**
 * 앱 상태 — docs/FUNCTIONAL_SPEC.md §3-1, §3-14
 * 단일 스토어. 영속 값은 앱인토스 Storage에 즉시 저장한다. 서버는 없다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createStore, loadAnonProfile, type AnonProfile } from '@ait/kit';
import type { JudgeInput, Scenario, Settings, Unlock, Verdict } from '@/types';
import { SAVED_CAP, SAVED_FREE, SCHEMA_VERSION } from '@/constants';
import { emptyUnlock, isUnlocked, unlockUntilMidnight } from '@/engine/gate';

const store = createStore('rc');

export const KEY = {
  profile: store.key('profile'),
  lastInput: store.key('lastInput'),
  scenarios: store.key('scenarios'),
  unlock: store.key('unlock'),
  settings: store.key('settings'),
} as const;

const defaultSettings: Settings = { cardHideDeposit: false };

export interface AppState {
  ready: boolean;
  loadError: boolean;
  profile: AnonProfile | null;
  lastInput: JudgeInput | null;
  scenarios: Scenario[];
  unlock: Unlock;
  settings: Settings;
}

const initial: AppState = {
  ready: false,
  loadError: false,
  profile: null,
  lastInput: null,
  scenarios: [],
  unlock: emptyUnlock,
  settings: defaultSettings,
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(initial);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [profile, lastInput, scenarios, unlock, settings] = await Promise.all([
          loadAnonProfile(store, KEY.profile, SCHEMA_VERSION),
          store.readJson<JudgeInput | null>(KEY.lastInput, null),
          store.readJson<Scenario[]>(KEY.scenarios, []),
          store.readJson<Unlock>(KEY.unlock, emptyUnlock),
          store.readJson<Settings>(KEY.settings, defaultSettings),
        ]);
        if (!alive) return;
        setState({ ready: true, loadError: false, profile, lastInput, scenarios, unlock, settings });
      } catch {
        if (alive) setState((s) => ({ ...s, ready: true, loadError: true }));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setLastInput = useCallback((input: JudgeInput) => {
    setState((s) => ({ ...s, lastInput: input }));
    void store.writeJson(KEY.lastInput, input);
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...ref.current.settings, ...patch };
    setState((s) => ({ ...s, settings: next }));
    void store.writeJson(KEY.settings, next);
  }, []);

  const unlockToday = useCallback(() => {
    const next = unlockUntilMidnight(Date.now());
    setState((s) => ({ ...s, unlock: next }));
    void store.writeJson(KEY.unlock, next);
  }, []);

  /** 저장 한도. 잠금 상태에서는 무료 3개, 해제 상태에서는 20개 */
  const savedCap = useCallback(
    () => (isUnlocked(ref.current.unlock, Date.now()) ? SAVED_CAP : SAVED_FREE),
    [],
  );

  /** 결과: 'saved' | 'gate'(광고 필요) | 'cap'(상한 도달) */
  const saveScenario = useCallback(
    (input: JudgeInput, result: { verdict: Verdict | null; increase: number }): 'saved' | 'gate' | 'cap' => {
      const { scenarios, unlock } = ref.current;
      if (scenarios.length >= SAVED_FREE && !isUnlocked(unlock, Date.now())) return 'gate';
      if (scenarios.length >= SAVED_CAP) return 'cap';
      const next: Scenario[] = [
        ...scenarios,
        { id: `${Date.now()}-${scenarios.length}`, input, createdAt: new Date().toISOString(), result },
      ];
      setState((s) => ({ ...s, scenarios: next }));
      void store.writeJson(KEY.scenarios, next);
      return 'saved';
    },
    [],
  );

  const deleteScenario = useCallback((id: string) => {
    const next = ref.current.scenarios.filter((x) => x.id !== id);
    setState((s) => ({ ...s, scenarios: next }));
    void store.writeJson(KEY.scenarios, next);
  }, []);

  const clearAll = useCallback(async () => {
    setState((s) => ({
      ...s,
      lastInput: null,
      scenarios: [],
      unlock: emptyUnlock,
      settings: defaultSettings,
    }));
    await Promise.all([
      store.remove(KEY.lastInput),
      store.remove(KEY.scenarios),
      store.remove(KEY.unlock),
      store.remove(KEY.settings),
    ]);
  }, []);

  // 반환 객체는 메모이즈한다. 매 렌더마다 새 객체를 주면
  // 이 객체를 의존성에 넣은 useEffect 가 무한히 다시 돈다.
  return useMemo(
    () => ({ state, setLastInput, setSettings, unlockToday, savedCap, saveScenario, deleteScenario, clearAll }),
    [state, setLastInput, setSettings, unlockToday, savedCap, saveScenario, deleteScenario, clearAll],
  );
}

export type Store = ReturnType<typeof useAppStore>;
