import ko from './ko.json';

export type CopyKey = keyof typeof ko;

/** {name} 자리를 채운다 */
export function t(key: CopyKey, vars?: Record<string, string | number>): string {
  const raw = ko[key] as string;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = vars[name];
    return v === undefined ? m : String(v);
  });
}

export { ko };
