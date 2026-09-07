/** 시간축 — docs/SCREEN_FLOW.md S04. 차별점 B */
import { useMemo } from 'react';
import type { CalcOptions } from '@/types';
import { RATES } from '@/data';
import { computeTimeline } from '@/engine/timeline';
import { num, pct, won } from '@/engine/format';
import { BarChart } from '@/components/BarChart';
import { BasisFooter } from '@/components/BasisFooter';
import { t } from '@/i18n';

interface Props {
  annualGross: number;
  opts: CalcOptions;
  onShare: () => void;
}

export function timelineHeadline(delta: number, baseYear: number): string {
  if (delta === 0) return t('timeline.headline.same', { y0: baseYear });
  const key = delta > 0 ? 'timeline.headline.more' : 'timeline.headline.less';
  return t(key, { y0: baseYear, delta: num(Math.abs(delta)) });
}

export function Timeline({ annualGross, opts, onShare }: Props) {
  const tl = useMemo(() => computeTimeline(annualGross, opts), [annualGross, opts]);
  const hasUnverified = tl.rows.some((r) => {
    const row = RATES.filter((x) => x.from <= `${r.year}-12-31`).at(-1);
    return (row?.needsVerification?.length ?? 0) > 0;
  });

  return (
    <main className="screen">
      <p className="summary">연봉 {num(annualGross)}원 기준</p>
      <h2 className="card__headline">{timelineHeadline(tl.deltaDeductions, tl.baseYear)}</h2>

      <BarChart
        bars={tl.rows.map((r) => ({
          label: String(r.year),
          value: r.netMonthly,
          note: r.breakdown.taxTableFallback,
        }))}
        format={(v) => num(Math.round(v / 1000))}
      />
      <p className="hint">{t('timeline.axis.net')} · 단위 천 원</p>

      <h3 className="section-title">{t('timeline.rates.title')}</h3>
      <table className="detail">
        <thead>
          <tr>
            <th scope="col">연도</th>
            <th scope="col">국민연금</th>
            <th scope="col">건강보험</th>
            <th scope="col">장기요양</th>
            <th scope="col">월 실수령</th>
          </tr>
        </thead>
        <tbody>
          {tl.rows.map((r) => (
            <tr key={r.year} className="detail__row">
              <th scope="row">{r.year}</th>
              <td>{pct(r.rates.npsTotal, 2)}</td>
              <td>{pct(r.rates.nhisTotal, 2)}</td>
              <td>{pct(r.rates.ltcOnPremium, 2)}</td>
              <td>{won(r.netMonthly)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="hint">{t('timeline.footnote.rates')}</p>
      {tl.fallbackYears.length > 0 && <p className="hint">* {t('timeline.footnote.fallback')}</p>}
      {hasUnverified && <p className="hint">{t('timeline.footnote.unverified')}</p>}

      <button type="button" className="cta" onClick={onShare}>
        {t('timeline.share')}
      </button>
      <BasisFooter
        effectiveFrom={tl.rows.at(-1)?.breakdown.taxTableEffectiveFrom}
        year={opts.asOf.slice(0, 4)}
      />
    </main>
  );
}
