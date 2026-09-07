/**
 * 홈 — 역산이 첫 화면이다 (docs/SCREEN_FLOW.md S01, PRD 차별점 A).
 * 정방향은 같은 화면에서 모드만 바꾼다.
 */
import { useEffect, useMemo, useState } from 'react';
import type { CalcMode, CalcOptions } from '@/types';
import { CHILDREN_MAX, DEPENDENTS_MAX, DEPENDENTS_MIN, NONTAX_MEAL_DEFAULT } from '@/constants';
import { computeGross } from '@/engine/reverse';
import { computeNet } from '@/engine/net';
import { manwon, num, pct, todayIso, won } from '@/engine/format';
import { isDevData } from '@/data';
import { t } from '@/i18n';
import { MoneyInput } from '@/components/MoneyInput';

const DEBOUNCE_MS = 300;

export function Home() {
  const [mode, setMode] = useState<CalcMode>('reverse');
  const [raw, setRaw] = useState<number | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const [dependents, setDependents] = useState(1);
  const [children, setChildren] = useState(0);
  const [meal, setMeal] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  // 입력 디바운스 — 타이핑 중에는 계산하지 않는다
  useEffect(() => {
    const id = setTimeout(() => setValue(raw), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [raw]);

  // 자녀는 공제대상 가족에 포함된다. 넘치면 가족 수를 올린다
  const adjusted = children + 1 > dependents;
  const effectiveDependents = Math.min(Math.max(dependents, children + 1), DEPENDENTS_MAX);

  const opts: CalcOptions = useMemo(
    () => ({
      dependents: effectiveDependents,
      children,
      nonTaxableMonthly: meal ? NONTAX_MEAL_DEFAULT : 0,
      taxRatio: 1,
      asOf: todayIso(),
    }),
    [effectiveDependents, children, meal],
  );

  const result = useMemo(() => {
    if (value === null || value <= 0) return null;
    if (mode === 'reverse') {
      const r = computeGross(value * 10_000, opts);
      return { breakdown: r.breakdown, reverse: r };
    }
    return { breakdown: computeNet(value * 10_000, opts), reverse: null };
  }, [value, mode, opts]);

  const b = result?.breakdown;

  return (
    <main className="screen">
      {isDevData && <p className="dev-banner">{t('data.dev')}</p>}

      <MoneyInput
        prefix={mode === 'reverse' ? t('home.input.prefix') : t('gross.input.prefix')}
        suffix={mode === 'reverse' ? t('home.input.suffix') : t('gross.input.suffix')}
        placeholder={mode === 'reverse' ? t('home.input.placeholder') : '4097'}
        value={raw}
        onChange={setRaw}
      />

      <div className="chips">
        <button type="button" className="chip" onClick={() => setDependents((d) => (d >= DEPENDENTS_MAX ? DEPENDENTS_MIN : d + 1))}>
          가족 {effectiveDependents}명
        </button>
        <button type="button" className="chip" onClick={() => setChildren((c) => (c >= CHILDREN_MAX ? 0 : c + 1))}>
          자녀 {children}
        </button>
        <button type="button" className={`chip ${meal ? 'chip--on' : ''}`} onClick={() => setMeal((m) => !m)}>
          식대 {meal ? '포함' : '미포함'}
        </button>
      </div>
      {adjusted && <p className="note">{t('options.childrenAdjusted', { n: effectiveDependents })}</p>}

      {!b && <p className="hint">{mode === 'reverse' ? t('home.input.hint') : t('gross.input.hint')}</p>}

      {b && (
        <section className="card">
          <h2 className="card__headline">
            {mode === 'reverse'
              ? t('home.result.headline', { gross: manwon(result!.reverse!.annualGrossDisplay) })
              : t('gross.result.headline', { net: num(b.netMonthly) })}
          </h2>
          <p className="card__sub">
            {mode === 'reverse'
              ? t('home.result.sub', { net: num(b.netMonthly) })
              : t('gross.result.sub', { netAnnual: num(b.netAnnual), ded: num(b.deductions) })}
          </p>
          <button type="button" className="card__link" onClick={() => setShowDetail((v) => !v)}>
            {t('home.result.deductions', { ded: num(b.deductions) })} {showDetail ? '▲' : '▾'}
          </button>
          <p className="card__items">{t('home.result.items')}</p>

          {showDetail && (
            <table className="detail">
              <tbody>
                <Row label={t('detail.row.gross')} value={b.grossMonthly} />
                <Row label={t('detail.row.nonTaxable')} value={-opts.nonTaxableMonthly} />
                <Row label={t('detail.row.taxable')} value={b.taxableMonthly} />
                <Row label={t('detail.row.nps')} value={b.nps} note={b.capped.nps} />
                <Row label={t('detail.row.nhis')} value={b.nhis} note={b.capped.nhis} />
                <Row label={t('detail.row.ltc')} value={b.ltc} />
                <Row label={t('detail.row.ei')} value={b.ei} />
                <Row label={t('detail.row.incomeTax')} value={b.incomeTax} />
                <Row label={t('detail.row.localTax')} value={b.localTax} />
                <Row label={t('detail.row.deductions')} value={b.deductions} strong />
                <Row label={t('detail.row.net')} value={b.netMonthly} strong />
              </tbody>
            </table>
          )}
        </section>
      )}

      <button
        type="button"
        className="switch"
        onClick={() => {
          setMode((m) => (m === 'reverse' ? 'forward' : 'reverse'));
          setRaw(null);
          setValue(null);
          setShowDetail(false);
        }}
      >
        {mode === 'reverse' ? t('home.switch.toForward') : t('gross.switch.toReverse')}
      </button>

      <footer className="basis">
        <p>{t('privacy.line')}</p>
        {b && (
          <p>
            {t('basis.line', {
              effectiveFrom: b.taxTableEffectiveFrom,
              year: opts.asOf.slice(0, 4),
            })}
          </p>
        )}
        <p>{t('disclaimer.full')}</p>
        <p>{t('disclaimer.yearEnd')}</p>
      </footer>
    </main>
  );
}

function Row({ label, value, note, strong }: { label: string; value: number; note?: 'min' | 'max' | null; strong?: boolean }) {
  return (
    <tr className={strong ? 'detail__row detail__row--strong' : 'detail__row'}>
      <th scope="row">
        {label}
        {note === 'max' && <span className="badge">{t('detail.capped')}</span>}
        {note === 'min' && <span className="badge">{t('detail.floored')}</span>}
      </th>
      <td>{won(value)}</td>
    </tr>
  );
}

export { pct };
