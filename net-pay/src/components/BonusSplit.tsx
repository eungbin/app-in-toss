/** 상여 분리 표 — docs/FUNCTIONAL_SPEC.md §4-5 (US-5) */
import type { BonusSplitResult } from '@/engine/bonus';
import { num, won } from '@/engine/format';
import { t } from '@/i18n';

export function BonusSplit({ r }: { r: BonusSplitResult }) {
  return (
    <section className="card">
      <h2 className="card__headline">{t('bonus.title')}</h2>
      <table className="detail">
        <thead>
          <tr>
            <th scope="col">{t('bonus.col.month')}</th>
            <th scope="col">{t('bonus.col.gross')}</th>
            <th scope="col">{t('bonus.col.net')}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="detail__row">
            <th scope="row">{t('bonus.plain', { n: r.plainMonths })}</th>
            <td>{won(r.plain.gross)}</td>
            <td>{won(r.plain.net)}</td>
          </tr>
          <tr className="detail__row">
            <th scope="row">{t('bonus.month', { n: r.bonusMonths })}</th>
            <td>{won(r.bonus.gross)}</td>
            <td>{won(r.bonus.net)}</td>
          </tr>
          <tr className="detail__row detail__row--strong">
            <th scope="row">{t('bonus.annual')}</th>
            <td />
            <td>{won(r.annualNet)}</td>
          </tr>
        </tbody>
      </table>
      <p className="card__items">
        {t('bonus.detail', {
          base: num(r.baseMonthly),
          each: num(r.bonusEach),
          period: r.periodMonths,
        })}
      </p>
      <p className="hint">{t('bonus.note')}</p>
      <p className="hint">{t('bonus.insuranceNote')}</p>
    </section>
  );
}
