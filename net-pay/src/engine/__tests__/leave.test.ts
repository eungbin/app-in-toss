import { describe, expect, it } from 'vitest';
import { computeLeavePay } from '../leave';

describe('연차수당', () => {
  it('월 통상임금 300만 원·209시간·5일', () => {
    const r = computeLeavePay({ monthlyOrdinary: 3_000_000, monthlyHours: 209, unusedDays: 5 });
    expect(r.hourly).toBe(14_354);
    expect(r.daily).toBe(114_832);
    expect(r.pay).toBe(574_160);
  });

  it('반일 단위 연차를 계산한다', () => {
    const r = computeLeavePay({ monthlyOrdinary: 3_000_000, monthlyHours: 209, unusedDays: 2.5 });
    expect(r.pay).toBe(Math.floor(114_832 * 2.5));
  });

  it('소정근로시간이 0이면 1시간으로 막는다', () => {
    const r = computeLeavePay({ monthlyOrdinary: 3_000_000, monthlyHours: 0, unusedDays: 1 });
    expect(Number.isFinite(r.hourly)).toBe(true);
  });

  it('음수 입력은 0으로 본다', () => {
    const r = computeLeavePay({ monthlyOrdinary: -100, monthlyHours: 209, unusedDays: -3 });
    expect(r.pay).toBe(0);
  });
});
