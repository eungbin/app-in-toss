/**
 * .env 를 읽어 process.env 에 채운다. 이미 설정된 값은 덮어쓰지 않는다.
 * 빌드 스크립트에서만 쓴다(앱 런타임은 Vite 의 import.meta.env 를 쓴다).
 */
import { existsSync, readFileSync } from 'node:fs';

export function loadEnv(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
