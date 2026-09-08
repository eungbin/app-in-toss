/** 공제 상세 — docs/SCREEN_FLOW.md S03 */
import type { Breakdown, CalcOptions, ReverseResult } from '@/types';
import { computeBonusSplit, hasBonus, type BonusPlan } from '@/engine/bonus';
import { RATES } from '@/data';
import { rateFor } from '@/engine/rates';
import { num, pct } from '@/engine/format';
import { StackedBar, buildSlices } from '@/components/Donut';
import { buildRows, DeductionTable } from '@/components/DeductionTable';
import { BasisFooter } from '@/components/BasisFooter';
import { BannerAd } from '@/components/BannerAd';
import { BonusSplit } from '@/components/BonusSplit';
import { t } from '@/i18n';

interface Props {
  breakdown: Breakdown;
  opts: CalcOptions;
  reverse: ReverseResult | null;
  bonus: BonusPlan;
}

export function Detail({ breakdown, opts, reverse, bonus }: Props) {
  const rate = rateFor(RATES, opts.asOf);
  const rows = buildRows(breakdown, rate, opts.nonTaxableMonthly);
  const split = hasBonus(bonus) ? computeBonusSplit(breakdown.annualGross, bonus, opts) : null;
  const slices = buildSlices(breakdown);
  const netRatio = breakdown.grossMonthly > 0 ? breakdown.netMonthly / breakdown.grossMonthly : 0;

  return (
    <main className="screen">
      {/* 어떤 조건의 계산인지 */}
      <div className="chips chips--read">
        <span className="chip chip--sm">연봉 {num(breakdown.annualGross)}원</span>
        <span className="chip chip--sm">
          가족 {opts.dependents}명 · 자녀 {opts.children}명
        </span>
        {opts.nonTaxableMonthly > 0 && (
          <span className="chip chip--sm">식대 {num(opts.nonTaxableMonthly / 10_000)}만</span>
        )}
      </div>

      {/* 표를 읽기 전에 비율이 먼저 보이게 */}
      <div className="split-bar">
        <p className="split-bar__head">
          <span className="split-bar__label">{t('result.gross.label')}</span>
          <span className="split-bar__value">{num(breakdown.grossMonthly)}원</span>
        </p>
        <StackedBar slices={slices} total={breakdown.grossMonthly} />
        <p className="split-bar__foot">
          <span className="legend__dot" style={{ background: 'var(--primary)' }} />
          {t('detail.split.net', { p: pct(netRatio, 1) })}
          <span className="split-bar__spacer" />
          {t('detail.split.ded', { p: pct(1 - netRatio, 1) })}
        </p>
      </div>

      <DeductionTable rows={rows} />
      {reverse && <p className="note">{t('detail.reverseNote', { target: num(reverse.target) })}</p>}
      {split && <BonusSplit r={split} />}
      <BasisFooter effectiveFrom={breakdown.taxTableEffectiveFrom} year={opts.asOf.slice(0, 4)} />
      <BannerAd />
    </main>
  );
}
