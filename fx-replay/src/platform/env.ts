/** 실행 환경 판별. 토스 앱 밖(브라우저 개발)에서는 SDK가 없다. */
import { Storage } from '@apps-in-toss/web-framework';

let cached: boolean | null = null;

export function isTossEnv(): boolean {
  if (cached !== null) return cached;
  try {
    cached = typeof Storage?.getItem === 'function' && /tossmini|intoss/i.test(location.hostname + navigator.userAgent);
  } catch {
    cached = false;
  }
  return cached;
}

export const isDev = import.meta.env.DEV;
