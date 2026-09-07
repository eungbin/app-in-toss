import { describe, expect, it } from 'vitest';
import { createT } from '@ait/kit';
import { progressLabel, t } from '@/i18n';

describe('t (@ait/kit createT)', () => {
  it('사전의 문구를 그대로 돌려준다', () => {
    expect(t('event.continue')).toBe('확인');
  });

  it('{name} 자리를 채운다', () => {
    expect(t('home.daily.remaining', { n: 3 })).toBe('오늘 남은 리플레이 3회');
  });

  it('값이 없는 자리표시자는 그대로 남긴다', () => {
    const local = createT({ x: '{a}와 {b}' });
    expect(local('x', { a: '가' })).toBe('가와 {b}');
  });

  it('vars 를 안 넘기면 원문 그대로', () => {
    const local = createT({ x: '{a}' });
    expect(local('x')).toBe('{a}');
  });

  it('여러 자리표시자를 모두 치환한다', () => {
    expect(t('scen.meta', { series: '원/달러 환율', range: '2005.01', days: '60거래일' })).toBe(
      '원/달러 환율 · 2005.01 · 60거래일',
    );
  });
});

describe('progressLabel', () => {
  it('타임프레임별 표기', () => {
    expect(progressLabel('day', 12, 60)).toBe('Day 12 / 60');
    expect(progressLabel('week', 12, 104)).toBe('12주 / 104');
    expect(progressLabel('month', 12, 120)).toBe('12개월 / 120');
  });
});
