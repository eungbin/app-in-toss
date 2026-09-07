/** 비교 — docs/SCREEN_FLOW.md S09. 평가·유불리 문구는 넣지 않는다(원칙 B3) */
import { useMemo } from 'react';
import type { Breakdown, CalcInput, Scenario } from '@/types';
import { computeNet } from '@/engine/net';
import { computeGross } from '@/engine/reverse';
import { num, won } from '@/engine/format';
import { BasisFooter } from '@/components/BasisFooter';
import { t } from '@/i18n';

function breakdownOf(input: CalcInput): Breakdown {
  if (input.mode === 'reverse') return computeGross(input.targetNet ?? 0, input).breakdown;
  return computeNet(input.annualGross ?? 0, input);
}

const ROWS: { label: string; pick: (b: Breakdown) => number }[] = [
  { label: '연봉', pick: (b) => b.annualGross },
  { label: '세전 월급', pick: (b) => b.grossMonthly },
  { label: '과세 월급', pick: (b) => b.taxableMonthly },
  { label: '국민연금', pick: (b) => b.nps },
  { label: '건강보험', pick: (b) => b.nhis },
  { label: '장기요양', pick: (b) => b.ltc },
  { label: '고용보험', pick: (b) => b.ei },
  { label: '소득세', pick: (b) => b.incomeTax },
  { label: '지방소득세', pick: (b) => b.localTax },
  { label: '공제 합계', pick: (b) => b.deductions },
  { label: '월 실수령', pick: (b) => b.netMonthly },
];

export function Compare({ a, b }: { a: Scenario; b: Scenario }) {
  const ba = useMemo(() => breakdownOf(a.input), [a]);
  const bb = useMemo(() => breakdownOf(b.input), [b]);

  return (
    <main className="screen">
      <table className="detail detail--compare">
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">{a.name}</th>
            <th scope="col">{b.name}</th>
            <th scope="col">{t('compare.col.diff')}</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const va = r.pick(ba);
            const vb = r.pick(bb);
            const d = vb - va;
            const last = r.label === '월 실수령';
            return (
              <tr key={r.label} className={last ? 'detail__row detail__row--strong' : 'detail__row'}>
                <th scope="row">{r.label}</th>
                <td>{won(va)}</td>
                <td>{won(vb)}</td>
                <td>{d === 0 ? '—' : `${d > 0 ? '+' : '−'}${num(Math.abs(d))}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <BasisFooter effectiveFrom={bb.taxTableEffectiveFrom} year={b.input.asOf.slice(0, 4)} />
    </main>
  );
}
