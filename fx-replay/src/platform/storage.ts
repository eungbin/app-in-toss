/**
 * 저장소 — docs/FUNCTIONAL_SPEC.md §3-11 (US-2)
 * 앱인토스 Storage API를 쓴다. localStorage·IndexedDB는 프로덕션에서 쓰지 않는다.
 * 브라우저 개발 중에는 SDK가 없으므로 메모리+localStorage 폴백을 쓴다(개발 전용).
 */
import { Storage } from '@apps-in-toss/web-framework';
import { isDev } from './env';

const memory = new Map<string, string>();

async function withFallback<T>(sdk: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await sdk();
  } catch (e) {
    if (!isDev) throw e;
    return fallback();
  }
}

export const store = {
  async get(key: string): Promise<string | null> {
    return withFallback(
      () => Storage.getItem(key),
      () => memory.get(key) ?? globalThis.localStorage?.getItem(key) ?? null,
    );
  },
  async set(key: string, value: string): Promise<void> {
    return withFallback(
      () => Storage.setItem(key, value),
      () => {
        memory.set(key, value);
        try {
          globalThis.localStorage?.setItem(key, value);
        } catch {
          /* 개발 폴백 */
        }
      },
    );
  },
  async remove(key: string): Promise<void> {
    return withFallback(
      () => Storage.removeItem(key),
      () => {
        memory.delete(key);
        try {
          globalThis.localStorage?.removeItem(key);
        } catch {
          /* 개발 폴백 */
        }
      },
    );
  },
};

/** 키 이름 — §3-11 */
export const KEY = {
  profile: 'fxr.profile',
  quota: 'fxr.quota',
  session: 'fxr.session',
  history: 'fxr.history',
  notes: 'fxr.notes',
  badges: 'fxr.badges',
  entitlements: 'fxr.entitlements',
  recentSegments: 'fxr.recentSegments',
  settings: 'fxr.settings',
} as const;

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await store.get(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await store.set(key, JSON.stringify(value));
  } catch {
    try {
      await store.set(key, JSON.stringify(value));
    } catch {
      console.warn(`[storage] 쓰기 실패: ${key}`);
    }
  }
}
