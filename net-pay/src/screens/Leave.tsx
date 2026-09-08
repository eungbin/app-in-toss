/** 연차수당 — docs/SCREEN_FLOW.md S07 */
import { useMemo, useState } from 'react';
import { ORDINARY_HOURS_DEFAULT } from '@/constants';
import { computeLeavePay } from '@/engine/leave';
import { num, won } from '@/engine/format';
import { BasisFooter } from '@/components/BasisFooter';
import { MoneyField } from './Severance';
import { Icon } from '@/components/Icon';
import { t } from '@/i18n';

export function Leave({ grossMonthly }: { grossMonthly: number }) {
  const [monthlyOrdinary, setMonthlyOrdinary] = useState<number | null>(grossMonthly || null);
  const [monthlyHours, setMonthlyHours] = useState<number | null>(ORDINARY_HOURS_DEFAULT);
  const [days, setDays] = useState('');
  const [showFormula, setShowFormula] = useState(false);

  const unusedDays = /^\d+(\.[05])?$/.test(days) ? Number(days) : null;
  const r = useMemo(
    () =>
      monthlyOrdinary && monthlyHours && unusedDays !== null
        ? computeLeavePay({ monthlyOrdinary, monthlyHours, unusedDays })
        : null,
    [monthlyOrdinary, monthlyHours, unusedDays],
  );

  return (
    <main className="screen">
      <MoneyField label={t('leave.monthlyOrdinary')} value={monthlyOrdinary} onChange={setMonthlyOrdinary} />
      <MoneyField
        label={t('leave.monthlyHours')}
        value={monthlyHours}
        onChange={setMonthlyHours}
        suffix="시간"
        max={4}
        hint="주 40시간이면 209시간"
      />
      <label className="field">
        <span className="field__label">{t('leave.unusedDays')}</span>
        <span className="field__row">
          <input
            className="field__input field__input--num"
            type="text"
            inputMode="decimal"
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))}
          />
          <span className="field__suffix">일</span>
        </span>
        <span className="field__hint">반일은 0.5로 적어요</span>
      </label>

      {r && (
        <section className="card card--primary">
          <p className="card__label">{t('leave.result')}</p>
          <h2 className="card__headline card__headline--num">{won(r.pay)}</h2>
          <p className="card__sub">{t('leave.rates', { hourly: num(r.hourly), daily: num(r.daily) })}</p>
          <button type="button" className="card__link" onClick={() => setShowFormula((v) => !v)}>
            {t('formula.show')}
            <Icon name={showFormula ? 'chevronUp' : 'chevronDown'} />
          </button>
          {showFormula && (
            <p className="detail__formula">
              (월 통상임금 ÷ {num(monthlyHours ?? 0)}시간) × 8시간 × {days}일
            </p>
          )}
        </section>
      )}

      <p className="hint">{t('leave.note')}</p>
      <BasisFooter withYearEnd={false} />
    </main>
  );
}
