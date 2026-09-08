/**
 * 결과 화면 — docs/SCREEN_FLOW.md S02 (계산 탭 2단계)
 *
 * 숫자보다 도넛이 먼저 읽히게 둔다. 세전 월급이 실수령과 공제로 어떻게
 * 갈라지는지가 이 앱이 답하는 것이고, 표는 그 다음 화면(S03)이다.
 */
import type { Breakdown, CalcOptions, ReverseResult } from '@/types';
import { manwon, num, pct } from '@/engine/format';
import { computeTimeline, timelineYears } from '@/engine/timeline';
import { timelineHeadline } from './Timeline';
import { Donut, buildSlices } from '@/components/Donut';
import { LockedCard, BarSilhouette } from '@/components/LockedCard';
import { BasisFooter } from '@/components/BasisFooter';
import { BannerAd } from '@/components/BannerAd';
import { Icon } from '@/components/Icon';
import { t } from '@/i18n';

interface Props {
  breakdown: Breakdown;
  opts: CalcOptions;
  reverse: ReverseResult | null;
  mode: 'reverse' | 'forward';
  timelineLocked: boolean;
  /** 상여가 있으면 달마다 실수령이 달라진다 */
  hasBonus: boolean;
  onDetail: () => void;
  onTimeline: () => void;
  onCard: () => void;
  onSave: () => void;
}

export function Result(p: Props) {
  const { breakdown: b, opts, reverse } = p;
  const slices = buildSlices(b);
  const netRatio = b.grossMonthly > 0 ? b.netMonthly / b.grossMonthly : 0;

  return (
    <main className="screen">
      {/* 무엇을 물었는지 되짚어 준다 */}
      <p className="recap">
        {p.mode === 'reverse' && reverse
          ? t('result.recap.reverse', { net: manwon(reverse.target) })
          : t('result.recap.forward', { gross: manwon(b.annualGross) })}
      </p>
      <h2 className="headline">
        {p.mode === 'reverse' && reverse
          ? t('home.result.headline', { gross: manwon(reverse.annualGrossDisplay) })
          : t('gross.result.headline', { net: num(b.netMonthly) })}
      </h2>

      <section className="card card--primary">
        <div className="split">
          <Donut slices={slices} total={b.grossMonthly} netRatio={netRatio} />
          <div className="split__side">
            <div className="stat">
              <p className="stat__label">{t('result.net.label')}</p>
              <p className="stat__value">{num(b.netMonthly)}원</p>
            </div>
            <div className="stat">
              <p className="stat__label">{t('result.gross.label')}</p>
              <p className="stat__value stat__value--sm">{num(b.grossMonthly)}원</p>
            </div>
          </div>
        </div>

        {/* 도넛과 같은 순서·같은 색 */}
        <ul className="legend">
          {slices
            .filter((s) => s.key !== 'net')
            .map((s) => (
              <li key={s.key} className="legend__item">
                <span className="legend__dot" style={{ background: s.color }} />
                <span className="legend__name">{s.label}</span>
                <span className="legend__value">{num(s.amount)}</span>
              </li>
            ))}
        </ul>

        <button type="button" className="card__row" onClick={p.onDetail}>
          {t('home.result.deductions', { ded: num(b.deductions) })}
          <Icon name="chevronRight" />
        </button>
        {p.hasBonus && <p className="note">{t('home.bonusHint')}</p>}
      </section>

      <TimelinePreview
        annualGross={b.annualGross}
        opts={opts}
        locked={p.timelineLocked}
        onUnlock={p.onTimeline}
        onOpen={p.onTimeline}
      />

      <div className="row">
        <button type="button" className="cta cta--secondary" onClick={p.onCard}>
          <Icon name="share" />
          {t('result.card')}
        </button>
        <button type="button" className="cta cta--secondary" onClick={p.onSave}>
          <Icon name="bookmark" />
          {t('save.cta')}
        </button>
      </div>

      <p className="hint">{t('result.ratio', { p: pct(netRatio, 1) })}</p>

      <BasisFooter
        effectiveFrom={b.taxTableEffectiveFrom}
        year={opts.asOf.slice(0, 4)}
        withPrivacy
      />
      <BannerAd />
    </main>
  );
}

/**
 * 시간축 미리보기.
 * 잠긴 동안에는 계산조차 하지 않는다. 자리표시자만 보여준다.
 */
function TimelinePreview({
  annualGross,
  opts,
  locked,
  onUnlock,
  onOpen,
}: {
  annualGross: number;
  opts: CalcOptions;
  locked: boolean;
  onUnlock: () => void;
  onOpen: () => void;
}) {
  const years = timelineYears(opts.asOf);
  const first = years[0];

  const placeholder = (
    <>
      <p className="card__sub card__sub--tight">{t('timeline.card.sub', { y: String(first ?? '') })}</p>
      <BarSilhouette n={years.length} />
    </>
  );

  return (
    <LockedCard
      title={t('timeline.card.title')}
      locked={locked}
      placeholder={placeholder}
      onUnlock={onUnlock}
      onOpen={onOpen}
    >
      <TimelineNumbers annualGross={annualGross} opts={opts} />
    </LockedCard>
  );
}

function TimelineNumbers({ annualGross, opts }: { annualGross: number; opts: CalcOptions }) {
  const tl = computeTimeline(annualGross, opts);
  const first = tl.rows[0];
  const last = tl.rows.at(-1);
  return (
    <>
      <p className="card__sub">{timelineHeadline(tl.deltaDeductions, tl.baseYear)}</p>
      {first && last && (
        <p className="card__sub card__sub--tight">
          {first.year}년 {num(first.netMonthly)}원 → {last.year}년 {num(last.netMonthly)}원
        </p>
      )}
    </>
  );
}
