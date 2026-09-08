/** 딥링크 — FUNCTIONAL_SPEC 2장 (US-3) */
import { describe, expect, it } from 'vitest';
import { buildDeepLinkPath, parseDeepLink } from '../deeplink';

describe('parseDeepLink', () => {
  it('갱신 모드 전체 파라미터', () => {
    expect(parseDeepLink('/j', '?m=renew&cd=100000000&cr=0&pd=50000000&pr=250000')).toEqual({
      mode: 'renew',
      currentDeposit: 100_000_000,
      currentRent: 0,
      proposedDeposit: 50_000_000,
      proposedRent: 250_000,
    });
  });

  it('m 이 없으면 갱신으로 본다', () => {
    expect(parseDeepLink('/j', '?pd=50000000')?.mode).toBe('renew');
  });

  it('m=new 는 신규 계약', () => {
    expect(parseDeepLink('/j', '?m=new&pd=80000000')?.mode).toBe('new');
  });

  it('다른 경로는 무시한다', () => {
    expect(parseDeepLink('/', '?pd=1')).toBeNull();
    expect(parseDeepLink('/x', '?pd=1')).toBeNull();
  });

  it('잘못된 값은 그 파라미터만 버린다', () => {
    const r = parseDeepLink('/j', '?cd=abc&cr=-5&pd=50000000&pr=');
    expect(r?.currentDeposit).toBeNull();
    expect(r?.currentRent).toBeNull();
    expect(r?.proposedDeposit).toBe(50_000_000);
    expect(r?.proposedRent).toBeNull();
  });

  it('상한을 넘는 값은 버린다', () => {
    expect(parseDeepLink('/j', '?pd=999999999999')?.proposedDeposit).toBeNull();
  });
});

describe('buildDeepLinkPath', () => {
  it('갱신은 현재·제안을 모두 넣는다', () => {
    const path = buildDeepLinkPath({
      mode: 'renew',
      currentDeposit: 100_000_000,
      currentRent: 0,
      proposedDeposit: 50_000_000,
      proposedRent: 250_000,
    });
    expect(path).toBe('/j?m=renew&cd=100000000&cr=0&pd=50000000&pr=250000');
  });

  it('신규는 현재 조건을 붙이지 않는다', () => {
    const path = buildDeepLinkPath({
      mode: 'new',
      currentDeposit: 1,
      currentRent: 2,
      proposedDeposit: 80_000_000,
      proposedRent: 300_000,
    });
    expect(path).toBe('/j?m=new&pd=80000000&pr=300000');
  });

  it('왕복: build → parse 가 같은 값', () => {
    const args = {
      mode: 'renew' as const,
      currentDeposit: 30_000_000,
      currentRent: 500_000,
      proposedDeposit: 10_000_000,
      proposedRent: 600_000,
    };
    const path = buildDeepLinkPath(args);
    const [, search] = path.split('?');
    const parsed = parseDeepLink('/j', `?${search ?? ''}`);
    expect(parsed).toEqual({
      mode: 'renew',
      currentDeposit: args.currentDeposit,
      currentRent: args.currentRent,
      proposedDeposit: args.proposedDeposit,
      proposedRent: args.proposedRent,
    });
  });
});
