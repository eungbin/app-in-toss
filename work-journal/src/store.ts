/**
 * 앱 상태 — docs/FUNCTIONAL_SPEC.md §3-1, §3-15
 *
 * 영속 값은 앱인토스 Storage 에 즉시 저장한다. 서버·계정은 없다.
 * 기록은 **월별 키로 나눠** 저장한다(`wj.records.YYYY-MM`) — 한 키가 무한히 커지지 않게.
 * `wj.months` 가 기록이 있는 월의 목록이고, CSV·전체 삭제가 그것을 인덱스로 쓴다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createStore, loadAnonProfile, type AnonProfile } from '@ait/kit';
import { SCHEMA_VERSION } from '@/constants';
import type { Settings, Unlock, Workplace, WorkRecord } from '@/types';
import { addMonths, monthKey } from '@/engine/date';

const store = createStore('wj');

export const KEY = {
  profile: store.key('profile'),
  workplaces: store.key('workplaces'),
  unlock: store.key('unlock'),
  settings: store.key('settings'),
  months: store.key('months'),
  records: (month: string) => store.key(`records.${month}`),
} as const;

const emptyUnlock: Unlock = { until: null };
const defaultSettings: Settings = { cardHideMoney: false, lastWorkplaceId: null, lastBreakMin: 60 };

export interface AppState {
  ready: boolean;
  profile: AnonProfile | null;
  workplaces: Workplace[];
  /** 로드된 월의 기록. 월 키 → 기록 배열 */
  records: Record<string, WorkRecord[]>;
  months: string[];
  unlock: Unlock;
  settings: Settings;
  loadFailed: boolean;
}

const initial: AppState = {
  ready: false,
  profile: null,
  workplaces: [],
  records: {},
  months: [],
  unlock: emptyUnlock,
  settings: defaultSettings,
  loadFailed: false,
};

/** 정렬하고 중복을 없앤 월 목록 */
const uniqSorted = (xs: string[]): string[] => [...new Set(xs)].sort();

/** 기기 로컬 다음 자정 */
export function nextMidnight(now = new Date()): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

export function isUnlocked(unlock: Unlock, now = Date.now()): boolean {
  return unlock.until !== null && now < unlock.until;
}

export function useAppStore() {
  const [state, setState] = useState<AppState>(initial);
  const ref = useRef(state);
  ref.current = state;

  /** 그 달과 앞뒤 달 — 주가 달을 걸치므로 인접 달이 필요하다 */
  const loadMonths = useCallback(async (center: string) => {
    const want = [addMonths(center, -1), center, addMonths(center, 1)];
    const missing = want.filter((m) => ref.current.records[m] === undefined);
    if (missing.length === 0) return;

    const loaded = await Promise.all(
      missing.map(async (m) => [m, await store.readJson<WorkRecord[]>(KEY.records(m), [])] as const),
    );
    setState((s) => {
      const next = { ...s.records };
      for (const [m, recs] of loaded) next[m] = recs;
      return { ...s, records: next };
    });
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const center = monthKey(new Date().toISOString().slice(0, 10));
      const want = [addMonths(center, -1), center, addMonths(center, 1)];
      let failed = false;
      const guard = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
        try {
          return await p;
        } catch {
          failed = true;
          return fallback;
        }
      };

      const [profile, workplaces, months, unlock, settings, ...recs] = await Promise.all([
        guard(loadAnonProfile(store, KEY.profile, SCHEMA_VERSION), null as AnonProfile | null),
        guard(store.readJson<Workplace[]>(KEY.workplaces, []), []),
        guard(store.readJson<string[]>(KEY.months, []), []),
        guard(store.readJson<Unlock>(KEY.unlock, emptyUnlock), emptyUnlock),
        guard(store.readJson<Settings>(KEY.settings, defaultSettings), defaultSettings),
        ...want.map((m) => guard(store.readJson<WorkRecord[]>(KEY.records(m), []), [])),
      ]);
      if (!alive) return;

      const records: Record<string, WorkRecord[]> = {};
      want.forEach((m, i) => {
        records[m] = recs[i] ?? [];
      });

      setState({
        ready: true,
        profile,
        workplaces,
        records,
        months: uniqSorted(months),
        unlock,
        settings: { ...defaultSettings, ...settings },
        loadFailed: failed,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ── 근무지 ─────────────────────────────────────────── */

  const saveWorkplace = useCallback((wp: Workplace) => {
    setState((s) => {
      const exists = s.workplaces.some((w) => w.id === wp.id);
      const workplaces = exists ? s.workplaces.map((w) => (w.id === wp.id ? wp : w)) : [...s.workplaces, wp];
      void store.writeJson(KEY.workplaces, workplaces);
      return { ...s, workplaces };
    });
  }, []);

  const removeWorkplace = useCallback((id: string) => {
    setState((s) => {
      const workplaces = s.workplaces.filter((w) => w.id !== id);
      void store.writeJson(KEY.workplaces, workplaces);

      // 그 근무지의 기록도 함께 지운다 — 남겨 두면 합계에 잡히지 않는 유령 데이터가 된다
      const records: Record<string, WorkRecord[]> = {};
      for (const [m, list] of Object.entries(s.records)) {
        const kept = list.filter((r) => r.workplaceId !== id);
        records[m] = kept;
        if (kept.length !== list.length) void store.writeJson(KEY.records(m), kept);
      }
      return { ...s, workplaces, records };
    });
  }, []);

  /* ── 기록 ───────────────────────────────────────────── */

  const saveRecord = useCallback((rec: WorkRecord, previousMonth?: string) => {
    setState((s) => {
      const month = monthKey(rec.date);
      const records = { ...s.records };

      // 날짜를 바꿔 저장하면 월이 달라질 수 있다 — 옛 월에서 지운다
      if (previousMonth && previousMonth !== month) {
        const old = (records[previousMonth] ?? []).filter((r) => r.id !== rec.id);
        records[previousMonth] = old;
        void store.writeJson(KEY.records(previousMonth), old);
      }

      const list = records[month] ?? [];
      const next = list.some((r) => r.id === rec.id)
        ? list.map((r) => (r.id === rec.id ? rec : r))
        : [...list, rec];
      records[month] = next;
      void store.writeJson(KEY.records(month), next);

      const months = uniqSorted([...s.months, month]);
      if (months.length !== s.months.length) void store.writeJson(KEY.months, months);

      const settings: Settings = {
        ...s.settings,
        lastWorkplaceId: rec.workplaceId,
        lastBreakMin: rec.breakMin,
      };
      void store.writeJson(KEY.settings, settings);

      return { ...s, records, months, settings };
    });
  }, []);

  const removeRecord = useCallback((rec: WorkRecord) => {
    setState((s) => {
      const month = monthKey(rec.date);
      const list = (s.records[month] ?? []).filter((r) => r.id !== rec.id);
      void store.writeJson(KEY.records(month), list);
      return { ...s, records: { ...s.records, [month]: list } };
    });
  }, []);

  /* ── 게이트·설정 ────────────────────────────────────── */

  /** 리워드 보상 — userEarnedReward 에서만 부른다 */
  const openGate = useCallback(() => {
    const unlock: Unlock = { until: nextMidnight() };
    setState((s) => ({ ...s, unlock }));
    void store.writeJson(KEY.unlock, unlock);
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => {
      const settings = { ...s.settings, ...patch };
      void store.writeJson(KEY.settings, settings);
      return { ...s, settings };
    });
  }, []);

  /** 전체 삭제 — 월 키까지 모두 지운다 */
  const clearAll = useCallback(async () => {
    const months = ref.current.months;
    await Promise.all([
      ...months.map((m) => store.remove(KEY.records(m)).catch(() => {})),
      store.remove(KEY.workplaces).catch(() => {}),
      store.remove(KEY.months).catch(() => {}),
      store.remove(KEY.unlock).catch(() => {}),
      store.remove(KEY.settings).catch(() => {}),
    ]);
    setState((s) => ({
      ...s,
      workplaces: [],
      records: {},
      months: [],
      unlock: emptyUnlock,
      settings: defaultSettings,
    }));
  }, []);

  /** CSV 용 — 저장된 모든 월의 기록 */
  const readAllRecords = useCallback(async (): Promise<WorkRecord[]> => {
    const months = uniqSorted([...ref.current.months, ...Object.keys(ref.current.records)]);
    const lists = await Promise.all(
      months.map((m) =>
        ref.current.records[m] !== undefined
          ? Promise.resolve(ref.current.records[m] as WorkRecord[])
          : store.readJson<WorkRecord[]>(KEY.records(m), []).catch(() => []),
      ),
    );
    return lists.flat();
  }, []);

  return {
    state,
    loadMonths,
    saveWorkplace,
    removeWorkplace,
    saveRecord,
    removeRecord,
    openGate,
    setSettings,
    clearAll,
    readAllRecords,
  };
}

/** 기록·근무지 id — 시간순으로 정렬되는 짧은 문자열 */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
