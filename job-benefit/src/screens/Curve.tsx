/** S03 재취업 시점별 곡선 — docs/SCREEN_FLOW.md S03. 게이트 뒤에 있다 */
import { useMemo } from 'react';
import type { Breakdown } from '@/types';
import { curve } from '@/engine';
import { t } from '@/i18n';
import { BannerAd } from '@/components/BannerAd';
import { CurveChart } from '@/components/CurveChart';
import { Icon } from '@/components/Icon';

interface Props {
  result: Breakdown;
  unlocked: boolean;
  onUnlock: () => void;
}

const won = (n: number): string => n.toLocaleString('ko-KR');

export function Curve({ result, unlocked, onUnlock }: Props) {
  const half = Math.ceil(result.benefitDays / 2);
  /** 잠김 상태에서는 계산하지 않는다 — 수치가 DOM 에 들어가면 안 된다 */
  const points = useMemo(
    () => (unlocked ? curve(result.benefitDailyExact, result.benefitDays) : []),
    [unlocked, result.benefitDailyExact, result.benefitDays],
  );
  const cliff = result.benefitDays - half;
  const peak = points[cliff];
  const drop = points[cliff + 1];

  return (
    <div className="screen">
      <h2 style={{ margin: '12px 0 0', fontSize: 'var(--fs-title)', fontWeight: 700 }}>{t('s03.title')}</h2>

      <div className="card card--primary" style={{ marginTop: 16, padding: '18px 16px' }}>
        {unlocked ? (
          <>
            <CurveChart points={points} cliffDay={cliff} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 8,
                color: 'var(--text-3)',
                fontSize: 'var(--fs-micro)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>수급 시작</span>
              <span>{cliff}일</span>
              <span>{result.benefitDays}일</span>
            </div>
          </>
        ) : (
          <div className="silhouette" style={{ height: 132, marginTop: 0 }}>
            {[34, 52, 70, 88, 46, 58, 72].map((h, i, all) => (
              <span
                key={h}
                className={i === all.length - 1 ? 'silhouette__bar silhouette__bar--last' : 'silhouette__bar'}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {unlocked && peak && drop ? (
        <>
          <table className="detail">
            <tbody>
              <tr className="detail__row detail__row--strong">
                <th>{t('s03.point', { day: peak.day })}</th>
                <td>{t('s03.amount', { amount: won(peak.total) })}</td>
              </tr>
              <tr className="detail__row">
                <th>{t('s03.point', { day: drop.day })}</th>
                <td>{t('s03.amount', { amount: won(drop.total) })}</td>
              </tr>
            </tbody>
          </table>
          <p className="hint" style={{ marginTop: 8 }}>
            하루 차이로 {won(peak.total - drop.total)}원이 줄어요.
          </p>
        </>
      ) : null}

      <div className="card">
        <p style={{ margin: 0, fontSize: 'var(--fs-body)', color: 'var(--text-2)', lineHeight: 1.55 }}>
          {t('s03.body', { half })}
        </p>
        <p className="card__items">{t('s03.note.highWage')}</p>
      </div>

      {unlocked ? null : (
        <button type="button" className="card__cta" onClick={onUnlock}>
          <Icon name="lock" />
          {t('b03.cta')}
        </button>
      )}

      <BannerAd />
    </div>
  );
}
