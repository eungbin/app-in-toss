/**
 * 저장소 키 — docs/FUNCTIONAL_SPEC.md §3-11 (US-2)
 * 구현은 @ait/kit createStore. 이 파일은 앱 고유 키 이름만 가진다.
 */
import { createStore } from '@ait/kit';

export const store = createStore('fxr');

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

export const readJson: typeof store.readJson = (key, fallback) => store.readJson(key, fallback);
export const writeJson: typeof store.writeJson = (key, value) => store.writeJson(key, value);
