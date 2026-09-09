import { describe, expect, it } from 'vitest';
import { monthDeductions } from '../deductions';
import { computeNet } from '../net';
import { h, makeRecord, makeWorkplace } from './fixtures';

const TODAY = '2026-09-09';

describe('공제 (CE-5)', () => {
  it('월 세전을 12배로 넣으면 그 월액이 그대로 복원된다 — net-pay 엔진 진입 전제', () => {
    for (const monthly of [165_120, 333_333, 2_156_880, 1]) {
      const b = computeNet(monthly * 12, {
        dependents: 1,
        children: 0,
        nonTaxableMonthly: 0,
        taxRatio: 1,
        asOf: TODAY,
      });
      expect(b.grossMonthly).toBe(monthly);
    }
  });

  it('일반 근로 세전 165,120원 — net-pay 엔진 값을 따른다', () => {
    const d = monthDeductions(makeWorkplace(), 165_120, [], TODAY);
    // 국민연금은 기준소득월액 하한 410,000원 × 4.75%
    expect(d.nps).toBe(19_475);
    // 건강보험은 보수월액보험료 하한(총액 20,160원)의 근로자 부담분
    expect(d.nhis).toBe(10_080);
    expect(d.ltc).toBe(1_320);
    expect(d.ei).toBe(1_480);
    // 간이세액표 하한(월 과세급여 106만원) 미만이라 소득세는 0
    expect(d.incomeTax).toBe(0);
    expect(d.localTax).toBe(0);
    expect(d.total).toBe(32_355);
  });

  it('구판 화면의 27,650원은 재현하지 않는다 — 건강보험 하한 미적용 값이었다', () => {
    const d = monthDeductions(makeWorkplace(), 165_120, [], TODAY);
    expect(d.total).not.toBe(27_650);
    // 차이는 건강보험·장기요양 하한에서 온다
    expect(d.nhis + d.ltc).toBe(11_400);
  });

  it('보험 토글을 끄면 그 항목만 0이 된다', () => {
    const none = monthDeductions(
      makeWorkplace({ insurance: { nps: false, nhis: false, ei: false } }),
      165_120,
      [],
      TODAY,
    );
    expect(none.total).toBe(0);

    const npsOnly = monthDeductions(
      makeWorkplace({ insurance: { nps: true, nhis: false, ei: false } }),
      165_120,
      [],
      TODAY,
    );
    expect(npsOnly.nps).toBe(19_475);
    expect(npsOnly.nhis).toBe(0);
    expect(npsOnly.ltc).toBe(0);
    expect(npsOnly.ei).toBe(0);
  });

  it('월 보험 신고 보수를 넣으면 보험만 그 값으로 산정한다', () => {
    const d = monthDeductions(makeWorkplace({ reportedMonthly: 3_000_000 }), 165_120, [], TODAY);
    const ref = monthDeductions(makeWorkplace(), 3_000_000, [], TODAY);
    expect(d.nps).toBe(ref.nps);
    expect(d.nhis).toBe(ref.nhis);
    // 세금은 실제 세전(165,120원) 기준이라 0이다
    expect(d.incomeTax).toBe(0);
  });

  it('일용근로 — 일급 15만원 이하는 0원', () => {
    const wp = makeWorkplace({ incomeType: 'daily' });
    const d = monthDeductions(wp, 82_560, [makeRecord()], TODAY);
    expect(d.total).toBe(0);
  });

  it('일용근로 — 일급 20만원이면 1,350원 + 지방소득세 130원', () => {
    // 시급 25,000원 × 8시간 = 200,000원. (200,000 − 150,000) × 6% × 45%
    const wp = makeWorkplace({ incomeType: 'daily', hourlyWage: 25_000 });
    const d = monthDeductions(wp, 200_000, [makeRecord()], TODAY);
    expect(d.incomeTax).toBe(1_350);
    expect(d.localTax).toBe(130);
    expect(d.nps).toBe(0);
  });

  it('일용근로 — 원천징수세액이 1천원 미만이면 징수하지 않는다 (제86조 제1호)', () => {
    // 시급 22,500원 × 8시간 = 180,000원 → 30,000 × 2.7% = 810원
    const wp = makeWorkplace({ incomeType: 'daily', hourlyWage: 22_500 });
    const d = monthDeductions(wp, 180_000, [makeRecord()], TODAY);
    expect(d.total).toBe(0);
  });

  it('일용근로는 일별로 계산한다 — 같은 총액을 두 날에 나누면 세금이 다르다', () => {
    const wp = makeWorkplace({ incomeType: 'daily', hourlyWage: 25_000 });
    const oneDay = monthDeductions(wp, 200_000, [makeRecord()], TODAY);
    const twoDays = monthDeductions(
      wp,
      200_000,
      [
        makeRecord({ id: 'a', date: '2026-09-08', end: h(14), breakMin: 0 }),
        makeRecord({ id: 'b', date: '2026-09-09', end: h(14), breakMin: 0 }),
      ],
      TODAY,
    );
    // 하루 12.5만원씩이면 둘 다 15만원 공제에 미달해 0이다
    expect(oneDay.incomeTax).toBe(1_350);
    expect(twoDays.incomeTax).toBe(0);
  });

  it('사업소득 3.3% — 165,120원이면 4,950원 + 490원', () => {
    const wp = makeWorkplace({ incomeType: 'business' });
    const d = monthDeductions(wp, 165_120, [], TODAY);
    expect(d.incomeTax).toBe(4_950);
    expect(d.localTax).toBe(490);
    expect(d.nps).toBe(0);
    expect(d.total).toBe(5_440);
  });

  it('사업소득은 1천원 미만도 원천징수한다 — 시행령 제149조의3 소액부징수 예외', () => {
    const wp = makeWorkplace({ incomeType: 'business' });
    const d = monthDeductions(wp, 30_000, [], TODAY);
    // 30,000 × 3% = 900원. 소액부징수를 적용하면 0이 되어야 하지만 예외 대상이다
    expect(d.incomeTax).toBe(900);
  });
});
