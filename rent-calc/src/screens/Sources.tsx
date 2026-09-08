/** S10 데이터 출처 — docs/SCREEN_FLOW.md S10. meta 를 그대로 렌더한다 */
import { baserate, brokerage, legal } from '@/data';
import { t } from '@/i18n';

export function Sources() {
  return (
    <div className="screen">
      <section className="card">
        <h2 className="card__headline">기준금리</h2>
        <p>{baserate.meta.source}</p>
        <p className="hint">
          {baserate.meta.attribution} · 시계열 마지막 {baserate.meta.asOf} · 변동{' '}
          {baserate.changes.length}건
        </p>
        <p className="hint">{t('sources.nextUpdate')}</p>
      </section>

      <section className="card">
        <h2 className="card__headline">중개보수</h2>
        <p>{brokerage.meta.source}</p>
        <p className="hint">
          개정 {brokerage.meta.amendedOn} · 수집 {brokerage.meta.fetchedAt} ·{' '}
          {brokerage.meta.license}
        </p>
      </section>

      <section className="card">
        <h2 className="card__headline">조문</h2>
        <ul className="sources-list">
          {legal.items.map((item) => (
            <li key={item.key}>
              <a href={item.url} target="_blank" rel="noreferrer noopener">
                {item.law}
              </a>
              <span className="hint"> · 확인 {item.verifiedAt}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="notes">{t('sources.notAffiliated')}</p>
    </div>
  );
}
