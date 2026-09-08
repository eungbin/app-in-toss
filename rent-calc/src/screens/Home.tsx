/**
 * S01 홈 = 판정 — docs/SCREEN_FLOW.md S01
 *
 * 모드 세그먼트를 가장 위에 둔다. 신규 계약에는 법정 상한이 없으므로
 * 판정을 켜기 전에 사용자가 상황을 먼저 고르게 해야 한다(원칙 B4).
 */
import { useMemo } from 'react';
import type { Mode, Terms } from '@/types';
import { convertOnly, judgeRenewal } from '@/engine/judge';
import { legalConversionRate } from '@/engine/rate';
import { manwon, percent, percentShort, won } from '@/engine/format';
import { TermsGroup, type TermsDraft } from '@/components/TermsGroup';
import { t } from '@/i18n';

export interface Draft {
  mode: Mode;
  current: TermsDraft;
  proposed: TermsDraft;
}

interface Props {
  draft: Draft;
  onDraft: (d: Draft) => void;
  baseRate: number;
  asOf: string;
}

const 만 = 10_000;
const toTerms = (d: TermsDraft): Terms => ({
  deposit: (d.deposit ?? 0) * 만,
  rent: (d.rent ?? 0) * 만,
});
const isEmpty = (d: TermsDraft): boolean => d.deposit === null && d.rent === null;

export function Home({ draft, onDraft, baseRate, asOf }: Props) {
  const { mode, current, proposed } = draft;

  const result = useMemo(() => {
    if (isEmpty(proposed)) return null;
    const p = toTerms(proposed);
    if (mode === 'new') return convertOnly(p, baseRate);

    const c = toTerms(current);
    if (c.deposit + c.rent === 0) return null;
    return judgeRenewal({ mode: 'renew', current: c, proposed: p, baseRate });
  }, [mode, current, proposed, baseRate]);

  const rate = legalConversionRate(baseRate);

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

      <p className="hint">{t('rate.chip', { br: percentShort(baseRate), rate: percentShort(rate) })}</p>

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
          {result.verdict === 'exceeds' && <p className="note">{t('judge.consentRenewal')}</p>}
        </section>
      )}

      <footer className="basis">
        <p>{t('basis.judge', { br: percentShort(baseRate), asOf })}</p>
        <p>{t('disclaimer.full')}</p>
        <p>{t('privacy.line')}</p>
      </footer>
    </div>
  );
}
