/** 카드 문구 — FUNCTIONAL_SPEC 3-10 AC */
import { describe, expect, it } from 'vitest';
import { cardLines, shareText, timelineCardLines } from '../cardText';
import { judgeRenewal } from '../judge';
import { timeline } from '../timeline';
import { baserate } from '@/data';

const exceeds = judgeRenewal({
  mode: 'renew',
  current: { deposit: 100_000_000, rent: 0 },
  proposed: { deposit: 50_000_000, rent: 250_000 },
  baseRate: 0.03,
});

const within = judgeRenewal({
  mode: 'renew',
  current: { deposit: 100_000_000, rent: 0 },
  proposed: { deposit: 105_000_000, rent: 0 },
  baseRate: 0.03,
});

const args = (hideDeposit: boolean) => ({
  result: exceeds,
  proposedDeposit: 50_000_000,
  proposedRent: 250_000,
  hideDeposit,
});

describe('cardLines', () => {
  it('초과 헤드라인에 초과 월세가 들어간다', () => {
    expect(cardLines(args(false))[0]).toBe('제안 조건, 법정 상한을 월 20,833원 넘어요');
  });

  it('상한 안 헤드라인', () => {
    expect(
      cardLines({ result: within, proposedDeposit: 105_000_000, proposedRent: 0, hideDeposit: false })[0],
    ).toBe('제안 조건, 법정 상한 안이에요');
  });

  it('보증금 숨기기를 켜면 어느 줄에도 보증금 숫자가 없다', () => {
    const text = cardLines(args(true)).join(' ');
    expect(text).not.toContain('5,000');
    expect(text).toContain('●●●●');
    // 월세는 남는다
    expect(text).toContain('25');
  });

  it('숨기지 않으면 보증금이 만 원 단위로 들어간다', () => {
    expect(cardLines(args(false)).join(' ')).toContain('5,000만 원');
  });

  it('기준금리·전환율 줄이 있다', () => {
    expect(cardLines(args(false))[2]).toBe('기준금리 3% · 전환율 5%');
  });
});

describe('shareText', () => {
  it('헤드라인 + 면책 문구', () => {
    const text = shareText(args(false));
    expect(text).toContain('법정 상한을 월 20,833원 넘어요');
    expect(text).toContain('참고용 판정');
  });

  it('숨기기를 켜면 공유 텍스트에도 보증금이 없다', () => {
    expect(shareText(args(true))).not.toContain('5,000');
  });
});

describe('timelineCardLines', () => {
  const rows = timeline(100_000_000, baserate, new Date('2026-09-08T12:00:00'));

  it('기준금리 변화와 차액을 서술한다', () => {
    const lines = timelineCardLines({ rows, deposit: 100_000_000, hideDeposit: false });
    expect(lines[2]).toContain('0.5%→3%');
    expect(lines[2]).toContain('208,334');
  });

  it('보증금 숨기기가 적용된다', () => {
    const lines = timelineCardLines({ rows, deposit: 100_000_000, hideDeposit: true });
    expect(lines[1]).toContain('●●●●');
  });
});
