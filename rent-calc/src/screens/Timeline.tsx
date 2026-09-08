/**
 * S03 시간축 — docs/SCREEN_FLOW.md S03
 * 5% 증액 상한은 연도와 무관하므로 전환율만 다룬다. 배너는 두지 않는다.
 */
import type { TimelineRow } from '@/types';
import { percentShort, won } from '@/engine/format';
import { BarChart } from '@/components/BarChart';
import { BasisFooter } from '@/components/BasisFooter';
import { t } from '@/i18n';

interface Props {
  rows: TimelineRow[];
  deposit: number;
  asOf: string;
  onShare: () => void;
}

export function Timeline({ rows, deposit, asOf, onShare }: Props) {
  const first = rows[0];
  const last = rows[rows.length - 1];

  return (
    <div className="screen">
      <h1 className="screen__title">{t('timeline.card.title')}</h1>
      <p className="hint">{t('timeline.sub', { d: won(deposit) })}</p>

      <BarChart bars={rows.map((r) => ({ label: r.label, value: r.maxRent }))} format={won} />

      {first !== undefined && last !== undefined && (
        <p className="lead">
          {t('timeline.headline', {
            r0: percentShort(first.baseRate),
            r1: percentShort(last.baseRate),
            delta: won(Math.abs(last.maxRent - first.maxRent)),
          })}
        </p>
      )}

      <table className="formula">
        <thead>
          <tr>
            <th scope="col">연도</th>
            <th scope="col">기준금리</th>
            <th scope="col">전환율</th>
            <th scope="col">상한 월세</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{percentShort(r.baseRate)}%</td>
              <td>{percentShort(r.legalRate)}%</td>
              <td>{won(r.maxRent)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="notes">{t('timeline.capNote')}</p>

      <button type="button" className="cta" onClick={onShare}>
        {t('timeline.share')}
      </button>

      <BasisFooter
        basis={t('basis.judge', { br: percentShort(last?.baseRate ?? 0), asOf })}
        disclaimer={t('disclaimer.full')}
      />
    </div>
  );
}
