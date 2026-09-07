/**
 * 익명 사용자 식별 — 앱인토스 `User.getAnonymousKey`.
 * 토스 로그인 없이 사용자를 구분해야 하는 모든 미니앱이 같은 흐름을 쓴다.
 * 앱은 저장소와 키 이름만 넘기고, 필요하면 AnonProfile 을 확장한다.
 */
import { User } from '@apps-in-toss/web-framework';
import type { AppStore } from './storage';

export interface AnonProfile {
  anonKey: string;
  schema: number;
  createdAt: string;
  /** getAnonymousKey 실패로 임시 uuid 를 쓰는 중. 다음 실행에 다시 시도한다 */
  anonKeyPending?: true;
}

const tempKey = (): string => `local-${crypto.randomUUID()}`;

/**
 * 저장된 프로필을 읽고, 없거나 임시 키 상태면 익명 키 발급을 시도한다.
 * 발급이 실패해도 앱은 정상 시작한다(체크리스트: 식별키 발급 후 정상 시작).
 */
export async function loadAnonProfile(
  store: AppStore,
  key: string,
  schema: number,
): Promise<AnonProfile> {
  const existing = await store.readJson<AnonProfile | null>(key, null);
  if (existing && !existing.anonKeyPending) return existing;

  let anonKey = existing?.anonKey ?? tempKey();
  let pending = true;
  try {
    if (User.getAnonymousKey.isSupported()) {
      const res = await User.getAnonymousKey();
      if (res.type === 'HASH' && res.hash) {
        anonKey = res.hash;
        pending = false;
      }
    }
  } catch {
    // 실패해도 앱은 정상 시작한다. 다음 시작 때 재시도.
  }

  const profile: AnonProfile = {
    anonKey,
    schema,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    ...(pending ? { anonKeyPending: true as const } : {}),
  };
  await store.writeJson(key, profile);
  return profile;
}
