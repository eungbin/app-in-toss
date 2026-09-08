/** 퇴직금 — docs/SCREEN_FLOW.md S06 */
import { useMemo, useState } from 'react';
import type { SeveranceInput } from '@/types';
import { computeSeverance } from '@/engine/severance';
import { computeSeveranceTax } from '@/engine/severanceTax';
import { num, won, won2 } from '@/engine/format';
import { BasisFooter } from '@/components/BasisFooter';
import { Icon } from '@/components/Icon';
import { t } from '@/i18n';

const today = new Date().toISOString().slice(0, 10);

export function Severance({ grossMonthly }: { grossMonthly: number }) {
  const [joinDate, setJoinDate] = useState('');
  const [lastWorkDate, setLastWorkDate] = useState(today);
  const [wages3m, setWages3m] = useState<number | null>(grossMonthly > 0 ? grossMonthly * 3 : null);
  const [annualBonus, setAnnualBonus] = useState<number | null>(null);
  const [annualLeavePay, setAnnualLeavePay] = useState<number | null>(null);
  const [ordinaryDaily, setOrdinaryDaily] = useState<number | null>(null);
  // 빈 입력칸 넷을 늘어놓지 않는다. 선택 항목은 접어 두고 필요할 때 펼친다
  const [showOptional, setShowOptional] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [showTax, setShowTax] = useState(false);

  const input: SeveranceInput | null = useMemo(() => {
    if (!joinDate || !lastWorkDate || !wages3m) return null;
    if (joinDate > lastWorkDate) return null;
    return {
      joinDate,
      lastWorkDate,
      wages3m,
      annualBonus: annualBonus ?? 0,
      annualLeavePay: annualLeavePay ?? 0,
      ordinaryDaily,
    };
  }, [joinDate, lastWorkDate, wages3m, annualBonus, annualLeavePay, ordinaryDaily]);

  const r = useMemo(() => (input ? computeSeverance(input) : null), [input]);
  const tax = useMemo(
    () => (r && !r.underOneYear && r.severance > 0 ? computeSeveranceTax(r.severance, r.days) : null),
    [r],
  );

  return (
    <main className="screen">
      <Field label={t('severance.joinDate')}>
        <input type="date" className="field__input" value={joinDate} max={lastWorkDate} onChange={(e) => setJoinDate(e.target.value)} />
      </Field>
      <Field label={t('severance.lastWorkDate')}>
        <input type="date" className="field__input" value={lastWorkDate} onChange={(e) => setLastWorkDate(e.target.value)} />
      </Field>
      <MoneyField label={t('severance.wages3m')} value={wages3m} onChange={setWages3m} hint="세전 월급 × 3으로 채워 뒀어요" />
      <button
        type="button"
        className="disclose"
        aria-expanded={showOptional}
        onClick={() => setShowOptional((v) => !v)}
      >
        <span className="disclose__label">{t('severance.optional')}</span>
        <span className="disclose__hint">{t('severance.optional.hint')}</span>
        <Icon name={showOptional ? 'chevronUp' : 'chevronDown'} />
      </button>
      {showOptional && (
        <>
          <MoneyField label={t('severance.annualBonus')} value={annualBonus} onChange={setAnnualBonus} />
          <MoneyField label={t('severance.annualLeavePay')} value={annualLeavePay} onChange={setAnnualLeavePay} />
          <MoneyField label={t('severance.ordinaryDaily')} value={ordinaryDaily} onChange={setOrdinaryDaily} />
        </>
      )}

      {joinDate && lastWorkDate && joinDate > lastWorkDate && (
        <p className="note">입사일이 마지막 근무일보다 뒤예요.</p>
      )}

      {r && (
        <section className="card card--primary">
          <p className="card__label">{t('severance.result')}</p>
          <h2 className="card__headline card__headline--num">{won(r.severance)}</h2>
          <p className="card__sub">
            {t('severance.period', { y: r.years, m: r.months, d: r.restDays, days: num(r.days) })}
          </p>
          <p className="card__sub">{t('severance.avgDaily', { won: won2(r.avgDaily) })}</p>
          {r.usedOrdinary && <p className="note">{t('severance.usedOrdinary')}</p>}
          {r.underOneYear && <p className="note">{t('severance.underOneYear')}</p>}
          <button type="button" className="card__link" onClick={() => setShowFormula((v) => !v)}>
            {t('formula.show')}
            <Icon name={showFormula ? 'chevronUp' : 'chevronDown'} />
          </button>
          {showFormula && (
            <p className="detail__formula">
              (3개월 임금 {num(Math.round(r.avgDaily * r.period3mDays))}원 ÷ {r.period3mDays}일 = {won2(r.avgDaily)}) × 30 × {num(r.days)}일 ÷ 365
            </p>
          )}
        </section>
      )}

      {tax && (
        <section className="card">
          <p className="card__label">{t('severance.tax.title')}</p>
          {tax.totalTax === 0 ? (
            <p className="note">{t('severance.tax.zero')}</p>
          ) : (
            <>
              <table className="detail">
                <tbody>
                  <tr className="detail__row">
                    <th scope="row">{t('severance.tax.income')}</th>
                    <td>{won(tax.incomeTax)}</td>
                  </tr>
                  <tr className="detail__row">
                    <th scope="row">{t('severance.tax.local')}</th>
                    <td>{won(tax.localTax)}</td>
                  </tr>
                  <tr className="detail__row detail__row--strong">
                    <th scope="row">{t('severance.tax.total')}</th>
                    <td>{won(tax.totalTax)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="card__label">{t('severance.tax.net')}</p>
              <h2 className="card__headline card__headline--num">{won(tax.netSeverance)}</h2>
            </>
          )}
          <button type="button" className="card__link" onClick={() => setShowTax((v) => !v)}>
            {t('formula.show')}
            <Icon name={showTax ? 'chevronUp' : 'chevronDown'} />
          </button>
          {showTax && (
            <table className="detail">
              <tbody>
                <tr className="detail__row">
                  <th scope="row">{t('severance.tax.years')}</th>
                  <td>{tax.years}년</td>
                </tr>
                <tr className="detail__row">
                  <th scope="row">{t('severance.tax.yearsDeduction')}</th>
                  <td>−{won(tax.yearsDeduction)}</td>
                </tr>
                <tr className="detail__row">
                  <th scope="row">{t('severance.tax.converted')}</th>
                  <td>{won(tax.converted)}</td>
                </tr>
                <tr className="detail__row">
                  <th scope="row">{t('severance.tax.convertedDeduction')}</th>
                  <td>−{won(tax.convertedDeduction)}</td>
                </tr>
                <tr className="detail__row detail__row--strong">
                  <th scope="row">{t('severance.tax.base')}</th>
                  <td>{won(tax.taxBase)}</td>
                </tr>
              </tbody>
            </table>
          )}
          <p className="card__items">{t('severance.tax.yearsNote')}</p>
        </section>
      )}

      <p className="hint">{t('severance.tax.irp')}</p>
      <p className="hint">{t('severance.tax.basis')}</p>
      <BasisFooter withYearEnd={false} />
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}

export function MoneyField({
  label,
  value,
  onChange,
  hint,
  suffix = '원',
  max = 12,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
  suffix?: string;
  max?: number;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="field__row">
        <input
          className="field__input field__input--num"
          type="text"
          inputMode="numeric"
          value={value === null ? '' : value.toLocaleString('ko-KR')}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, max);
            onChange(digits === '' ? null : Number(digits));
          }}
        />
        <span className="field__suffix">{suffix}</span>
      </span>
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}
