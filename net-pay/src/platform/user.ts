/**
 * 사용자 식별 — docs/FUNCTIONAL_SPEC.md §3-1 (US-1)
 * 익명 키 발급 흐름은 @ait/kit loadAnonProfile. 이 파일은 저장 위치와 앱 스키마만 정한다.
 * 토스 로그인은 결제를 넣는 릴리즈부터.
 */
import { loadAnonProfile } from '@ait/kit';
import type { Profile } from '@/types';
import { SCHEMA_VERSION } from '@/constants';
import { KEY, store } from './storage';

export const loadProfile = (): Promise<Profile> => loadAnonProfile(store, KEY.profile, SCHEMA_VERSION);
