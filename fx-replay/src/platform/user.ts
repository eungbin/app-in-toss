/**
 * 사용자 식별 — docs/FUNCTIONAL_SPEC.md §3-1 (US-1)
 * 익명 키만 사용한다. 토스 로그인은 v1.1 결제 릴리즈부터.
 */
import { User } from '@apps-in-toss/web-framework';
import type { Profile } from '@/types';
import { SCHEMA_VERSION } from '@/constants';
import { KEY, readJson, writeJson } from './storage';

function tempKey(): string {
  return `local-${crypto.randomUUID()}`;
}

export async function loadProfile(): Promise<Profile> {
  const existing = await readJson<Profile | null>(KEY.profile, null);
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

  const profile: Profile = {
    anonKey,
    schema: SCHEMA_VERSION,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    ...(pending ? { anonKeyPending: true as const } : {}),
  };
  await writeJson(KEY.profile, profile);
  return profile;
}
