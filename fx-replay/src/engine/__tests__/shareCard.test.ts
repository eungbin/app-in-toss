import { describe, expect, it } from 'vitest';
import { shareHeadline } from '@/components/shareCard';

describe('공유 문구', () => {
  it('연·월 서술형이며 성과 수치가 없다', () => {
    expect(shareHeadline('20080901')).toBe('나는 2008년 9월을 이렇게 지나왔다');
    expect(shareHeadline('20221230')).toBe('나는 2022년 12월을 이렇게 지나왔다');
  });

  it('월의 앞자리 0을 떼어 쓴다', () => {
    expect(shareHeadline('19970103')).toContain('1월');
  });

  it('수익·손실·순위 어휘가 들어가지 않는다', () => {
    const text = shareHeadline('20200203');
    expect(text).not.toMatch(/수익|손실|이겼|졌|랭킹|위|P/);
  });
});
