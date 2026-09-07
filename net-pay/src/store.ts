/**
 * 앱 상태 — docs/FUNCTIONAL_SPEC.md §3-1, §3-15
 * 단일 스토어. 모든 영속 값은 앱인토스 Storage에 즉시 저장한다. 서버는 없다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CalcInput, Profile, Scenario, Settings, Unlock } from '@/types';
import { NONTAX_MEAL_DEFAULT, SAVED_CAP, SAVED_FREE } from '@/constants';
import { KEY, readJson, store, writeJson } from '@/platform/storage';
import { loadProfile } from '@/platform/user';
import { emptyUnlock, isUnlocked, unlockUntilMidnight } from '@/engine/gate';
import { todayIso } from '@/engine/format';

export interface AppState {
  ready: boolean;
  loadError: boolean;
  profile: Profile | null;
  lastInput: CalcInput | null;
  scenarios: Scenario[];
  unlock: Unlock;
  settings: Settings;
}

export const defaultInput: CalcInput = {
  mode: 'reverse',
  dependents: 1,
  children: 0,
  nonTaxableMonthly: NONTAX_MEAL_DEFAULT,
  taxRatio: 1,
  asOf: todayIso(),
};

const initial: AppState = {
  ready: false,
  loadError: false,
  profile: null,
  lastInput: null,
  scenarios: [],
  unlock: emptyUnlock,
  settings: { cardHideGross: false },
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(initial);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [profile, lastInput, scenarios, unlock, settings] = await Promise.all([
          loadProfile(),
          readJson<CalcInput | null>(KEY.lastInput, null),
          readJson<Scenario[]>(KEY.scenarios, []),
          readJson<Unlock>(KEY.unlock, emptyUnlock),
          readJson<Settings>(KEY.settings, initial.settings),
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

  const setLastInput = useCallback((input: CalcInput) => {
    setState((s) => ({ ...s, lastInput: input }));
    void writeJson(KEY.lastInput, input);
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...ref.current.settings, ...patch };
    setState((s) => ({ ...s, settings: next }));
    void writeJson(KEY.settings, next);
  }, []);

  const unlockToday = useCallback(() => {
    const next = unlockUntilMidnight(Date.now());
    setState((s) => ({ ...s, unlock: next }));
    void writeJson(KEY.unlock, next);
  }, []);

  /** 저장 한도. 잠금 상태에서는 무료 3개, 해제 상태에서는 20개 */
  const savedCap = useCallback(
    () => (isUnlocked(ref.current.unlock, Date.now()) ? SAVED_CAP : SAVED_FREE),
    [],
  );

  /** 결과: 'saved' | 'gate'(광고 필요) | 'cap'(상한 도달) */
  const saveScenario = useCallback(
    (name: string, input: CalcInput): 'saved' | 'gate' | 'cap' => {
      const { scenarios, unlock } = ref.current;
      const unlocked = isUnlocked(unlock, Date.now());
      if (scenarios.length >= SAVED_FREE && !unlocked) return 'gate';
      if (scenarios.length >= SAVED_CAP) return 'cap';
      const next = [
        ...scenarios,
        { id: `${Date.now()}-${scenarios.length}`, name, input, createdAt: new Date().toISOString() },
      ];
      setState((s) => ({ ...s, scenarios: next }));
      void writeJson(KEY.scenarios, next);
      return 'saved';
    },
    [],
  );

  const deleteScenario = useCallback((id: string) => {
    const next = ref.current.scenarios.filter((x) => x.id !== id);
    setState((s) => ({ ...s, scenarios: next }));
    void writeJson(KEY.scenarios, next);
  }, []);

  const clearAll = useCallback(async () => {
    setState((s) => ({ ...s, lastInput: null, scenarios: [], unlock: emptyUnlock, settings: initial.settings }));
    await Promise.all([
      store.remove(KEY.lastInput),
      store.remove(KEY.scenarios),
      store.remove(KEY.unlock),
      store.remove(KEY.settings),
    ]);
  }, []);

  // 반환 객체는 반드시 메모이즈한다. 매 렌더마다 새 객체를 주면
  // 이 객체를 의존성에 넣은 useEffect 가 무한히 다시 돈다.
  return useMemo(
    () => ({ state, setLastInput, setSettings, unlockToday, savedCap, saveScenario, deleteScenario, clearAll }),
    [state, setLastInput, setSettings, unlockToday, savedCap, saveScenario, deleteScenario, clearAll],
  );
}

export type Store = ReturnType<typeof useAppStore>;
