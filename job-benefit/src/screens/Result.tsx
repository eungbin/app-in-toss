/**
 * S02 결과 — docs/SCREEN_FLOW.md S02
 *
 * 가장 큰 글자는 **일수**다. 8시간 근로자는 일액이 사실상 두 값뿐이라
 * 금액이 답이 될 수 없다(docs/FUNCTIONAL_SPEC.md 0-3).
 */
import type { Breakdown } from '@/types';
import { t } from '@/i18n';
import { BannerAd } from '@/components/BannerAd';
import { Icon } from '@/components/Icon';

interface Props {
  result: Breakdown;
  wageTotal3m: number;
  minWageYear: number;
  unlocked: boolean;
  onCurve: () => void;
  onShare: () => void;
  onAgain: () => void;
}

const won = (n: number): string => n.toLocaleString('ko-KR');
const hours = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, ''));

export function Result({ result, wageTotal3m, minWageYear, unlocked, onCurve, onShare, onAgain }: Props) {
  const { applied } = result;
  const whyKey = applied.includes('minDaily')
    ? 's02.why.minDaily'
    : applied.includes('minBase')
      ? 's02.why.minBase'
      : applied.includes('cap')
        ? 's02.why.cap'
        : applied.includes('ordinary')
          ? 's02.why.ordinary'
          : null;

  /** 총액은 내림 전 일액으로 곱한다(관공서와 같게). 소수가 있을 때만 그 사실을 밝힌다 */
  const dailyHasFraction = !Number.isInteger(result.benefitDailyExact);

  return (
    <div className="screen">
      <div className="card card--primary" style={{ marginTop: 12 }}>
        <span className="verdict" data-kind={result.verdict}>
          {t(`s02.verdict.${result.verdict}`)}
        </span>
        <p
          style={{
            margin: '16px 0 0',
            fontSize: 'var(--fs-hero)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {result.benefitDays}
          <span style={{ fontSize: 'var(--fs-display)', fontWeight: 600, marginLeft: 4 }}>일</span>
        </p>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 'var(--fs-display)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {t('s02.daily', { amount: won(result.benefitDaily) })}
        </p>
        <p className="card__sub">{t('s02.total', { amount: won(result.total) })}</p>
      </div>

      {dailyHasFraction ? <p className="hint">{t('s02.total.note')}</p> : null}

      {result.reasons.length > 0 ? (
        <div className="card">
          {result.reasons.map((r) => (
            <p key={r} style={{ margin: '0 0 6px', fontSize: 'var(--fs-body)', color: 'var(--text-2)', lineHeight: 1.55 }}>
              {t(`s02.reason.${r}` as never)}
            </p>
          ))}
        </div>
      ) : null}

      {whyKey !== null ? (
        <div className="card">
          <p className="card__label">{t('s02.why.title')}</p>
          <p style={{ margin: '6px 0 0', fontSize: 'var(--fs-body)', color: 'var(--text-2)', lineHeight: 1.55 }}>
            {t(whyKey as never)}
          </p>
        </div>
      ) : null}

      <p className="section-title">{t('s02.detail.title')}</p>
      <table className="detail" style={{ marginTop: 8 }}>
        <tbody>
          <tr className="detail__row">
            <th>{t('s02.detail.wageTotal')}</th>
            <td>{won(wageTotal3m)}원</td>
          </tr>
          <tr className="detail__row">
            <th>{t('s02.detail.average')}</th>
            <td>{won(Math.floor(result.averageDaily))}원 / 일</td>
          </tr>
          <tr className="detail__row">
            <th>{t('s02.detail.stdHours')}</th>
            <td>{hours(result.stdDayHours)}시간</td>
          </tr>
          <tr className="detail__row">
            <th>{t('s02.detail.minDaily')}</th>
            <td>{won(Math.floor(result.minBaseDaily * 0.8))}원</td>
          </tr>
          <tr className="detail__row">
            <th>{t('s02.detail.insured')}</th>
            <td>{result.insuredDaysEstimated.toLocaleString('ko-KR')}일</td>
          </tr>
          <tr className="detail__row detail__row--strong">
            <th>{t('s02.detail.total')}</th>
            <td>{won(result.total)}원</td>
          </tr>
        </tbody>
      </table>

      <div className="note">{t('s02.waiting.body', { days: result.benefitDays })}</div>

      <button type="button" className="card__cta" onClick={onCurve}>
        {unlocked ? null : <Icon name="lock" />}
        {t('s02.cta.curve')}
      </button>
      <button type="button" className="card__cta btn-primary--ghost" style={{ marginTop: 8 }} onClick={onShare}>
        <Icon name="share" />
        {t('s02.cta.share')}
      </button>
      <button type="button" className="sheet__later" onClick={onAgain}>
        {t('s02.cta.again')}
      </button>

      <div className="basis">
        <p>{t('s02.basis', { year: minWageYear })}</p>
        <p>{t('s02.disclaimer')}</p>
      </div>

      <BannerAd />
    </div>
  );
}
