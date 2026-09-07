/** 공제 상세 — docs/SCREEN_FLOW.md S03 */
import type { Breakdown, CalcOptions, ReverseResult } from '@/types';
import { computeBonusSplit, hasBonus, type BonusPlan } from '@/engine/bonus';
import { RATES } from '@/data';
import { rateFor } from '@/engine/rates';
import { num } from '@/engine/format';
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

  return (
    <main className="screen">
      <p className="summary">
        연봉 {num(breakdown.annualGross)}원 · 가족 {opts.dependents} · 자녀 {opts.children}
      </p>
      <DeductionTable rows={rows} />
      {reverse && <p className="note">{t('detail.reverseNote', { target: num(reverse.target) })}</p>}
      {split && <BonusSplit r={split} />}
      <BasisFooter effectiveFrom={breakdown.taxTableEffectiveFrom} year={opts.asOf.slice(0, 4)} />
      <BannerAd />
    </main>
  );
}
