/**
 * 저장소 키 — docs/FUNCTIONAL_SPEC.md §3-15 (US-2)
 * 구현은 @ait/kit createStore. 이 파일은 앱 고유 키 이름만 가진다.
 */
import { createStore } from '@ait/kit';

export const store = createStore('np');

export const KEY = {
  profile: 'np.profile',
  lastInput: 'np.lastInput',
  scenarios: 'np.scenarios',
  unlock: 'np.unlock',
  settings: 'np.settings',
  ads: 'np.ads',
} as const;

export const readJson: typeof store.readJson = (key, fallback) => store.readJson(key, fallback);
export const writeJson: typeof store.writeJson = (key, value) => store.writeJson(key, value);
