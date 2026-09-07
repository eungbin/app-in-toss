import ko from './ko.json';

type Key = keyof typeof ko;

/** 문구 조회. {name} 자리표시자를 치환한다. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  let s: string = ko[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}
