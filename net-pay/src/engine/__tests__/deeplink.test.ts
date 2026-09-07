import { describe, expect, it } from 'vitest';
import { buildDeepLinkPath, parseDeepLink } from '../deeplink';
import { NONTAX_MEAL_DEFAULT } from '@/constants';

describe('딥링크 파싱', () => {
  it('역산 경로를 읽는다', () => {
    expect(parseDeepLink('/r', '?net=3000000&dep=2&kids=1&nt=0')).toEqual({
      mode: 'reverse',
      amount: 3_000_000,
      dependents: 2,
      children: 1,
      nonTaxableMonthly: 0,
    });
  });

  it('정방향 경로를 읽는다', () => {
    const r = parseDeepLink('/g', '?gross=50000000');
    expect(r?.mode).toBe('forward');
    expect(r?.amount).toBe(50_000_000);
    expect(r?.dependents).toBeNull();
  });

  it('알 수 없는 경로는 null', () => {
    expect(parseDeepLink('/', '')).toBeNull();
    expect(parseDeepLink('/nope', '?net=1')).toBeNull();
  });

  it('잘못된 값은 그 항목만 무시한다', () => {
    const r = parseDeepLink('/r', '?net=abc&dep=99&kids=-1&nt=');
    expect(r).toEqual({
      mode: 'reverse',
      amount: null,
      dependents: null,
      children: null,
      nonTaxableMonthly: null,
    });
  });

  it('빌드한 경로를 다시 읽으면 같은 값이 나온다', () => {
    const args = { mode: 'reverse' as const, amount: 3_000_000, dependents: 3, children: 2, nonTaxableMonthly: 0 };
    const path = buildDeepLinkPath(args);
    const [p, q] = path.split('?');
    const back = parseDeepLink(p as string, `?${q}`);
    expect(back).toEqual({ ...args, amount: 3_000_000 });
  });

  it('기본값과 같은 항목은 경로에 넣지 않는다', () => {
    const path = buildDeepLinkPath({
      mode: 'reverse',
      amount: 3_000_000,
      dependents: 1,
      children: 0,
      nonTaxableMonthly: NONTAX_MEAL_DEFAULT,
    });
    expect(path).toBe('/r?net=3000000');
  });
});
