import { describe, expect, it } from 'vitest';
import { cardLines, cardShareText, type CardArgs } from '../cardText';

const base: CardArgs = {
  netMonthly: 3_000_000,
  annualGross: 40_970_000,
  deductions: 413_517,
  year: '2026',
  hideGross: false,
};

describe('협상 카드 문구', () => {
  it('기본 카드는 실수령·연봉·공제를 보여준다', () => {
    const lines = cardLines(base);
    expect(lines[0]).toContain('300');
    expect(lines.join(' ')).toContain('4,097');
    expect(lines).toHaveLength(3);
  });

  it('연봉 숨김을 켜면 카드에 연봉·공제 숫자가 남지 않는다', () => {
    const lines = cardLines({ ...base, hideGross: true });
    const joined = lines.join(' ');
    expect(lines).toHaveLength(1);
    expect(joined).not.toContain('4,097');
    expect(joined).not.toContain('41');
    expect(joined).toContain('300');
  });

  it('연봉 숨김을 켜면 공유 텍스트에도 연봉이 없다', () => {
    const text = cardShareText({ ...base, hideGross: true });
    expect(text).not.toContain('4,097');
    expect(text).not.toMatch(/연봉/);
    expect(text).toContain('300');
  });

  it('숨김을 끄면 공유 텍스트에 연봉이 들어간다', () => {
    const text = cardShareText(base);
    expect(text).toContain('4,097');
    expect(text).toContain('연봉');
  });

  it('참고용 표기가 공유 텍스트에 남아 있다', () => {
    expect(cardShareText(base)).toContain('참고용');
    expect(cardShareText({ ...base, hideGross: true })).toContain('참고용');
  });
});
