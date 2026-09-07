/**
 * 저장소 — 앱인토스 Storage API 래퍼.
 * localStorage·IndexedDB는 프로덕션에서 쓰지 않는다(iOS 7일 삭제·오리진 변경 이슈).
 * 브라우저 개발 중에는 SDK가 없으므로 메모리+localStorage 폴백을 쓴다(개발 전용).
 * 앱마다 `createStore('<prefix>')`로 인스턴스를 만들고 키 접두어를 분리한다.
 */
import { Storage } from '@apps-in-toss/web-framework';
import { isDev } from './env';

export interface AppStore {
  readonly prefix: string;
  /** `prefix.name` 형태의 키를 만든다 */
  key(name: string): string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  readJson<T>(key: string, fallback: T): Promise<T>;
  writeJson(key: string, value: unknown): Promise<void>;
}

const memory = new Map<string, string>();

async function withFallback<T>(sdk: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await sdk();
  } catch (e) {
    if (!isDev) throw e;
    return fallback();
  }
}

export function createStore(prefix: string): AppStore {
  const store: AppStore = {
    prefix,
    key: (name) => `${prefix}.${name}`,
    get(key) {
      return withFallback(
        () => Storage.getItem(key),
        () => memory.get(key) ?? globalThis.localStorage?.getItem(key) ?? null,
      );
    },
    set(key, value) {
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
    remove(key) {
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
    async readJson<T>(key: string, fallback: T): Promise<T> {
      try {
        const raw = await store.get(key);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    async writeJson(key, value) {
      const raw = JSON.stringify(value);
      try {
        await store.set(key, raw);
      } catch {
        try {
          await store.set(key, raw);
        } catch {
          console.warn(`[storage] 쓰기 실패: ${key}`);
        }
      }
    },
  };
  return store;
}
