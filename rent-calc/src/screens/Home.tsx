/**
 * S01 홈 = 판정 — docs/SCREEN_FLOW.md S01
 *
 * 모드 세그먼트를 가장 위에 둔다. 신규 계약에는 법정 상한이 없으므로
 * 판정을 켜기 전에 사용자가 상황을 먼저 고르게 해야 한다(원칙 B4).
 */
import { useEffect, useMemo } from 'react';
import type { ConvertResult, JudgeResult, Mode, Terms, TimelineRow } from '@/types';
import { convertOnly, judgeRenewal } from '@/engine/judge';
import { legalConversionRate } from '@/engine/rate';
import { manwon, percent, percentShort, won } from '@/engine/format';
import { TermsGroup, type TermsDraft } from '@/components/TermsGroup';
import { DateInput } from '@/components/DateInput';
import { LockedCard } from '@/components/LockedCard';
import { BannerAd } from '@/components/BannerAd';
import { BasisFooter } from '@/components/BasisFooter';
import { t } from '@/i18n';

export interface Draft {
  mode: Mode;
  current: TermsDraft;
  proposed: TermsDraft;
  /** "YYYY-MM-DD" 또는 빈 문자열 */
  lastChangeDate: string;
}

interface Props {
  draft: Draft;
  onDraft: (d: Draft) => void;
  baseRate: number;
  asOf: string;
  /** 기준금리를 사용자가 직접 넣었는지 */
  overridden: boolean;
  stale: string | undefined;
  timelineLocked: boolean;
  timelineRows: TimelineRow[];
  onResult: (r: JudgeResult | ConvertResult | null) => void;
  onOpenRate: () => void;
  onOpenDetail: () => void;
  onOpenTimeline: () => void;
  onUnlock: () => void;
  onMakeCard: () => void;
  onSave: () => void;
  onOpenBroker: () => void;
  onOpenReport: () => void;
  onOpenTool: (tool: 'convert' | 'broker' | 'report' | 'saved' | 'settings') => void;
}

const 만 = 10_000;
const toTerms = (d: TermsDraft): Terms => ({
  deposit: (d.deposit ?? 0) * 만,
  rent: (d.rent ?? 0) * 만,
});
const isEmpty = (d: TermsDraft): boolean => d.deposit === null && d.rent === null;

export function Home(props: Props) {
  const { draft, onDraft, baseRate, asOf, overridden, stale } = props;
  const { mode, current, proposed } = draft;

  const result = useMemo(() => {
    if (isEmpty(proposed)) return null;
    const p = toTerms(proposed);
    if (mode === 'new') return convertOnly(p, baseRate);

    const c = toTerms(current);
    if (c.deposit + c.rent === 0) return null;
    return judgeRenewal({
      mode: 'renew',
      current: c,
      proposed: p,
      baseRate,
      ...(draft.lastChangeDate === '' ? {} : { lastChangeDate: draft.lastChangeDate }),
    });
  }, [mode, current, proposed, baseRate, draft.lastChangeDate]);

  // 결과를 상위로 올려 상세·카드·저장이 같은 값을 쓰게 한다
  const onResult = props.onResult;
  useEffect(() => onResult(result), [result, onResult]);

  const rate = legalConversionRate(baseRate);
  // 시간축은 제안 보증금 기준. 없으면 현재 보증금
  const timelineDeposit = (proposed.deposit ?? current.deposit ?? 0) * 만;

  return (
    <div className="screen">
      <div className="segment" role="group" aria-label={t('app.title')}>
        {(['renew', 'new'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => onDraft({ ...draft, mode: m })}
          >
            {t(m === 'renew' ? 'mode.renew' : 'mode.new')}
          </button>
        ))}
      </div>

      {mode === 'renew' && (
        <TermsGroup
          title={t('input.current')}
          value={current}
          onChange={(v) => onDraft({ ...draft, current: v })}
          depositPlaceholder="10000"
          rentPlaceholder="0"
        />
      )}
      <TermsGroup
        title={mode === 'renew' ? t('input.proposed') : t('input.newTerms')}
        value={proposed}
        onChange={(v) => onDraft({ ...draft, proposed: v })}
        depositPlaceholder="5000"
        rentPlaceholder="25"
      />

      <button type="button" className="chip" onClick={props.onOpenRate}>
        {t('rate.chip', { br: percentShort(baseRate), rate: percentShort(rate) })}
        {overridden ? ` ${t('basis.override')}` : ''} ›
      </button>

      {mode === 'renew' && (
        <DateInput
          label={t('input.lastChange')}
          value={draft.lastChangeDate}
          onChange={(v) => onDraft({ ...draft, lastChangeDate: v })}
        />
      )}

      {result === null ? (
        <p className="hint">{t('input.empty')}</p>
      ) : result.mode === 'new' ? (
        <section className="verdict" data-verdict="new">
          <h2>{t('new.headline')}</h2>
          <dl>
            <div>
              <dt>{t('new.rowRent')}</dt>
              <dd>
                {t('new.bodyDeposit', {
                  d: won((proposed.deposit ?? 0) * 만),
                  r: won(result.rentIfAllDeposit),
                })}
              </dd>
            </div>
            {result.depositIfAllRent > 0 && (
              <div>
                <dt>{t('new.rowDeposit')}</dt>
                <dd>
                  {t('new.bodyRent', {
                    r: won((proposed.rent ?? 0) * 만),
                    d: won(result.depositIfAllRent),
                  })}
                </dd>
              </div>
            )}
          </dl>
          <p className="note">{t('new.note')}</p>
        </section>
      ) : (
        <section className="verdict" data-verdict={result.verdict}>
          <h2>
            {result.verdict === 'within'
              ? t('judge.within')
              : t('judge.exceeds', { excess: won(result.excessAsRent) })}
          </h2>
          <dl>
            <div>
              <dt>{t('detail.increase')}</dt>
              <dd>{t('judge.increase', { inc: percent(result.increase) })}</dd>
            </div>
            <div>
              <dt>{t('detail.maxTitle')}</dt>
              <dd>
                {result.maxRentForProposedDeposit === null
                  ? t('judge.maxDeposit', { max: won(result.maxDepositForProposedRent ?? 0) })
                  : t('judge.maxRent', { max: won(result.maxRentForProposedDeposit) })}
              </dd>
            </div>
            <div>
              <dt>{t('detail.eqDeposit')}</dt>
              <dd>
                {manwon(result.currentEq)} → {manwon(result.proposedEq)} {t('input.unit')}
              </dd>
            </div>
          </dl>
          {result.withinOneYear === true && <p className="note">{t('judge.oneYear')}</p>}
          <button type="button" className="card__link" onClick={props.onOpenDetail}>
            {t('judge.detail')} ›
          </button>
        </section>
      )}

      {result !== null && timelineDeposit > 0 && (
        <LockedCard
          title={t('timeline.card.title')}
          locked={props.timelineLocked}
          placeholder={<p className="locked-body__row">2021년 ●●●,●●●원 → 최신 ●●●,●●●원</p>}
          onUnlock={props.onUnlock}
          onOpen={props.onOpenTimeline}
        >
          <p className="lead">
            {props.timelineRows.length > 0 &&
              t('timeline.headline', {
                r0: percentShort(props.timelineRows[0]?.baseRate ?? 0),
                r1: percentShort(props.timelineRows[props.timelineRows.length - 1]?.baseRate ?? 0),
                delta: won(
                  Math.abs(
                    (props.timelineRows[props.timelineRows.length - 1]?.maxRent ?? 0) -
                      (props.timelineRows[0]?.maxRent ?? 0),
                  ),
                ),
              })}
          </p>
        </LockedCard>
      )}

      {result !== null && (
        <>
          <div className="row">
            <button type="button" className="cta" onClick={props.onMakeCard}>
              {t('card.make')}
            </button>
            <button type="button" className="cta cta--secondary" onClick={props.onSave}>
              {t('save.cta')}
            </button>
          </div>
          <div className="row row--links">
            <button type="button" className="card__link" onClick={props.onOpenBroker}>
              {t('broker.link')} ›
            </button>
            <button type="button" className="card__link" onClick={props.onOpenReport}>
              {t('report.link')} ›
            </button>
          </div>
        </>
      )}

      <nav className="tools" aria-label="도구">
        {(
          [
            ['convert', t('convert.title')],
            ['broker', t('broker.title')],
            ['report', t('report.title')],
            ['saved', t('save.title')],
            ['settings', t('settings.title')],
          ] as const
        ).map(([key, label]) => (
          <button key={key} type="button" onClick={() => props.onOpenTool(key)}>
            {label}
          </button>
        ))}
      </nav>

      <BasisFooter
        basis={
          overridden
            ? t('basis.judgeManual', { br: percentShort(baseRate) })
            : t('basis.judge', { br: percentShort(baseRate), asOf })
        }
        {...(stale === undefined ? {} : { stale })}
        privacy
        disclaimer={t('disclaimer.full')}
      />
      <BannerAd />
    </div>
  );
}
