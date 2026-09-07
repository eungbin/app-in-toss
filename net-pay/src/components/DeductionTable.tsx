/** 공제 상세 표 — docs/SCREEN_FLOW.md S03 (UI-3). 행을 누르면 산식이 펼쳐진다 */
import { useState } from 'react';
import type { Breakdown, RateRow } from '@/types';
import { num, pct, won } from '@/engine/format';
import { t } from '@/i18n';

interface Row {
  label: string;
  monthly: number;
  basis?: string;
  formula?: string;
  cap?: 'min' | 'max' | null;
  strong?: boolean;
  negative?: boolean;
}

export function buildRows(b: Breakdown, rate: RateRow, nonTaxable: number): Row[] {
  const npsRate = rate.nps.totalRate * rate.nps.employeeShare;
  const nhisRate = rate.nhis.totalRate * rate.nhis.employeeShare;
  const eiRate = rate.ei.totalRate * rate.ei.employeeShare;
  return [
    { label: t('detail.row.gross'), monthly: b.grossMonthly },
    { label: t('detail.row.nonTaxable'), monthly: -nonTaxable, negative: true },
    { label: t('detail.row.taxable'), monthly: b.taxableMonthly },
    {
      label: t('detail.row.nps'),
      monthly: b.nps,
      basis: pct(npsRate),
      formula: `기준소득월액 × ${pct(rate.nps.totalRate)} ÷ 2 · 상한 ${num(rate.nps.baseMax)}원`,
      cap: b.capped.nps,
    },
    {
      label: t('detail.row.nhis'),
      monthly: b.nhis,
      basis: pct(nhisRate),
      formula: `과세 월급 × ${pct(rate.nhis.totalRate)} ÷ 2`,
      cap: b.capped.nhis,
    },
    {
      label: t('detail.row.ltc'),
      monthly: b.ltc,
      basis: pct(rate.nhis.ltcRateOnPremium, 2),
      formula: `건강보험료 × ${pct(rate.nhis.ltcRateOnPremium, 2)}`,
    },
    { label: t('detail.row.ei'), monthly: b.ei, basis: pct(eiRate), formula: `과세 월급 × ${pct(eiRate)}` },
    {
      label: t('detail.row.incomeTax'),
      monthly: b.incomeTax,
      formula: `간이세액표 ${b.taxTableEffectiveFrom} 시행`,
    },
    { label: t('detail.row.localTax'), monthly: b.localTax, formula: '소득세 × 10%' },
    { label: t('detail.row.deductions'), monthly: b.deductions, strong: true },
    { label: t('detail.row.net'), monthly: b.netMonthly, strong: true },
  ];
}

export function DeductionTable({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <table className="detail">
      <thead>
        <tr>
          <th scope="col">{t('detail.col.item')}</th>
          <th scope="col">{t('detail.col.monthly')}</th>
          <th scope="col">{t('detail.col.annual')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className={r.strong ? 'detail__row detail__row--strong' : 'detail__row'}>
            <th scope="row">
              <button
                type="button"
                className="detail__label"
                disabled={!r.formula}
                onClick={() => setOpen((o) => (o === r.label ? null : r.label))}
              >
                {r.label}
                {r.basis && <span className="detail__basis">{r.basis}</span>}
                {r.cap === 'max' && <span className="badge">{t('detail.capped')}</span>}
                {r.cap === 'min' && <span className="badge">{t('detail.floored')}</span>}
              </button>
              {open === r.label && r.formula && <span className="detail__formula">{r.formula}</span>}
            </th>
            <td>{won(r.monthly)}</td>
            <td>{won(r.monthly * 12)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
