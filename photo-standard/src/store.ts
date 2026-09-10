/**
 * 앱 상태 — docs/FUNCTIONAL_SPEC.md §3-1, §3-11
 *
 * 영속 값은 앱인토스 Storage 에 즉시 저장한다. 서버는 없다.
 *
 * **이미지는 어떤 형태로도 저장하지 않는다**(docs/PRD.md 2-1 A2).
 * 소스·결과는 메모리에만 두고 화면을 벗어나면 버린다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createStore, loadAnonProfile, type AnonProfile } from '@ait/kit';
import { SCHEMA_VERSION } from '@/constants';
import { DEFAULT_PRESET_ID } from '@/data/presets';
import { dateKey } from '@/engine/gate';

const store = createStore('ps');

export const KEY = {
  profile: store.key('profile'),
  usage: store.key('usage'),
  preset: store.key('preset'),
  custom: store.key('custom'),
} as const;

export interface CustomSpec {
  w: number;
  h: number;
  maxKb: number | null;
}

interface Usage {
  savedToday: number;
  /** 'YYYY-MM-DD' 로컬 */
  lastSavedDate: string;
  /** epoch ms. 이 시각 전까지 상한이 열려 있다 */
  gateOpenUntil: number | null;
}

const emptyUsage: Usage = { savedToday: 0, lastSavedDate: '', gateOpenUntil: null };

export const defaultCustom: CustomSpec = { w: 413, h: 531, maxKb: 500 };

export interface AppState {
  ready: boolean;
  profile: AnonProfile | null;
  presetId: string;
  custom: CustomSpec;
  usage: Usage;
}

const initial: AppState = {
  ready: false,
  profile: null,
  presetId: DEFAULT_PRESET_ID,
  custom: defaultCustom,
  usage: emptyUsage,
};

/** 날짜가 바뀌었으면 저장 횟수와 해제를 초기화한다(§3-1 4번) */
function rollOver(u: Usage, now: Date): Usage {
  return u.lastSavedDate === dateKey(now) ? u : emptyUsage;
}

export function useAppStore() {
  const [state, setState] = useState<AppState>(initial);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [profile, usage, presetId, custom] = await Promise.all([
        loadAnonProfile(store, KEY.profile, SCHEMA_VERSION).catch(() => null),
        store.readJson<Usage>(KEY.usage, emptyUsage).catch(() => emptyUsage),
        store.get(KEY.preset).catch(() => null),
        store.readJson<CustomSpec>(KEY.custom, defaultCustom).catch(() => defaultCustom),
      ]);
      if (!alive) return;
      setState({
        ready: true,
        profile,
        presetId: presetId ?? DEFAULT_PRESET_ID,
        custom,
        usage: rollOver(usage, new Date()),
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectPreset = useCallback((presetId: string) => {
    setState((s) => ({ ...s, presetId }));
    void store.set(KEY.preset, presetId);
  }, []);

  const setCustom = useCallback((custom: CustomSpec) => {
    setState((s) => ({ ...s, custom }));
    void store.writeJson(KEY.custom, custom);
  }, []);

  const countSave = useCallback(() => {
    const now = new Date();
    const base = rollOver(ref.current.usage, now);
    const usage: Usage = {
      ...base,
      savedToday: base.savedToday + 1,
      lastSavedDate: dateKey(now),
    };
    setState((s) => ({ ...s, usage }));
    void store.writeJson(KEY.usage, usage);
  }, []);

  /** 리워드 보상 — userEarnedReward 에서만 부른다 */
  const openGate = useCallback((until: number) => {
    const now = new Date();
    const base = rollOver(ref.current.usage, now);
    const usage: Usage = { ...base, gateOpenUntil: until, lastSavedDate: dateKey(now) };
    setState((s) => ({ ...s, usage }));
    void store.writeJson(KEY.usage, usage);
  }, []);

  return { state, selectPreset, setCustom, countSave, openGate };
}
