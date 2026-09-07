/**
 * 홈 — 역산이 첫 화면이다 (docs/SCREEN_FLOW.md S01, PRD 차별점 A).
 * 정방향은 같은 화면에서 모드만 바꾼다. 입력창에 자동 포커스하지 않는다
 * (키패드가 결과 카드와 차별점을 덮기 때문).
 */
import type { Breakdown, CalcOptions, ReverseResult } from '@/types';
import { isDevData } from '@/data';
import { manwon, num } from '@/engine/format';
import { computeTimeline, timelineYears } from '@/engine/timeline';
import { timelineHeadline } from './Timeline';
import { MoneyInput } from '@/components/MoneyInput';
import { LockedCard } from '@/components/LockedCard';
import { BasisFooter } from '@/components/BasisFooter';
import { BannerAd } from '@/components/BannerAd';
import { t } from '@/i18n';

export interface Draft {
  mode: 'reverse' | 'forward';
  /** 입력값(만 원). 비어 있으면 null */
  amountManwon: number | null;
  dependents: number;
  children: number;
  meal: boolean;
}

interface Props {
  draft: Draft;
  opts: CalcOptions;
  breakdown: Breakdown | null;
  reverse: ReverseResult | null;
  timelineLocked: boolean;
  savedCount: number;
  staleYear: string | null;
  onAmount: (v: number | null) => void;
  onToggleMode: () => void;
  onOptions: () => void;
  onDetail: () => void;
  onTimeline: () => void;
  onCard: () => void;
  onSave: () => void;
  onSaved: () => void;
  onSeverance: () => void;
  onLeave: () => void;
}

export function Home(p: Props) {
  const { draft, opts, breakdown, reverse } = p;
  const reverseMode = draft.mode === 'reverse';

  return (
    <main className="screen">
      {isDevData && <p className="dev-banner">{t('data.dev')}</p>}
      {p.staleYear && (
        <p className="dev-banner">
          {t('data.stale', { y: p.staleYear, y0: opts.asOf.slice(0, 4) })}
        </p>
      )}

      <MoneyInput
        prefix={reverseMode ? t('home.input.prefix') : t('gross.input.prefix')}
        suffix={reverseMode ? t('home.input.suffix') : t('gross.input.suffix')}
        placeholder={reverseMode ? t('home.input.placeholder') : '4100'}
        value={draft.amountManwon}
        onChange={p.onAmount}
      />

      <div className="chips">
        <button type="button" className="chip" onClick={p.onOptions}>
          가족 {opts.dependents}명
        </button>
        <button type="button" className="chip" onClick={p.onOptions}>
          자녀 {opts.children}
        </button>
        <button type="button" className={`chip ${draft.meal ? 'chip--on' : ''}`} onClick={p.onOptions}>
          식대 {draft.meal ? '포함' : '미포함'}
        </button>
      </div>

      {!breakdown && <p className="hint">{reverseMode ? t('home.input.hint') : t('gross.input.hint')}</p>}

      {breakdown && (
        <>
          <section className="card">
            <h2 className="card__headline">
              {reverseMode && reverse
                ? t('home.result.headline', { gross: manwon(reverse.annualGrossDisplay) })
                : t('gross.result.headline', { net: num(breakdown.netMonthly) })}
            </h2>
            <p className="card__sub">
              {reverseMode
                ? t('home.result.sub', { net: num(breakdown.netMonthly) })
                : t('gross.result.sub', { netAnnual: num(breakdown.netAnnual), ded: num(breakdown.deductions) })}
            </p>
            <button type="button" className="card__link" onClick={p.onDetail}>
              {t('home.result.deductions', { ded: num(breakdown.deductions) })} ›
            </button>
            <p className="card__items">{t('home.result.items')}</p>
          </section>

          <button type="button" className="switch" onClick={p.onToggleMode}>
            {reverseMode ? t('home.switch.toForward') : t('gross.switch.toReverse')}
          </button>

          <TimelinePreview
            annualGross={breakdown.annualGross}
            opts={opts}
            locked={p.timelineLocked}
            onUnlock={p.onTimeline}
            onOpen={p.onTimeline}
          />

          <div className="row">
            <button type="button" className="cta cta--secondary" onClick={p.onCard}>
              협상 카드 만들기
            </button>
            <button type="button" className="cta cta--secondary" onClick={p.onSave}>
              {t('save.cta')}
            </button>
          </div>
        </>
      )}

      {!breakdown && (
        <button type="button" className="switch" onClick={p.onToggleMode}>
          {reverseMode ? t('home.switch.toForward') : t('gross.switch.toReverse')}
        </button>
      )}

      <h3 className="section-title">{t('home.section.other')}</h3>
      <div className="row">
        <button type="button" className="tile" onClick={p.onSeverance}>
          {t('home.link.severance')} ›
        </button>
        <button type="button" className="tile" onClick={p.onLeave}>
          {t('home.link.leave')} ›
        </button>
      </div>
      <button type="button" className="row-link" onClick={p.onSaved}>
        {t('home.link.saved', { n: p.savedCount })} ›
      </button>

      <BasisFooter
        effectiveFrom={breakdown?.taxTableEffectiveFrom}
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
  const last = years.at(-1);

  const placeholder = (
    <>
      <p className="card__sub">{first}년부터 지금까지, 같은 연봉의 월 실수령을 나란히 봐요</p>
      <p className="card__sub card__sub--masked">
        {first}년 ●,●●●,●●●원 → {last}년 ●,●●●,●●●원
      </p>
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
        <p className="card__sub">
          {first.year}년 {num(first.netMonthly)}원 → {last.year}년 {num(last.netMonthly)}원
        </p>
      )}
    </>
  );
}
