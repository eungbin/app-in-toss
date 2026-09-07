/**
 * 문구 조회 — 앱마다 자기 사전(ko.json)을 넘겨 t() 를 만든다.
 * 키 타입이 사전에서 추론되므로 오타는 타입 오류로 잡힌다.
 */
export type CopyVars = Record<string, string | number>;

/**
 * `{name}` 자리를 vars 로 채운다.
 * 값이 없으면 자리표시자를 그대로 남겨 누락이 화면에서 보이게 한다.
 */
export function createT<D extends Record<string, string>>(dict: D) {
  return function t(key: keyof D, vars?: CopyVars): string {
    const raw = dict[key];
    if (raw === undefined) return String(key);
    if (vars === undefined) return raw;
    return raw.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const v = vars[name];
      return v === undefined ? whole : String(v);
    });
  };
}
