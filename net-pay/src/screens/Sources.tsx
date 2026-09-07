/** 데이터 출처 — docs/SCREEN_FLOW.md S11. "국세청 제공" 오인 문구 금지 */
import { RATES, TAX_TABLES } from '@/data';
import { t } from '@/i18n';

interface Item {
  title: string;
  detail: string;
  url?: string;
  checkedAt?: string;
}

export function Sources() {
  const items: Item[] = [];

  for (const tbl of TAX_TABLES) {
    items.push({
      title: `${tbl.meta.effectiveFrom} 시행 간이세액표`,
      detail: `${tbl.meta.source} · ${tbl.meta.license}${tbl.meta.amendedOn ? ` · 개정 ${tbl.meta.amendedOn}` : ''}`,
      url: tbl.meta.url,
      checkedAt: tbl.meta.fetchedAt,
    });
  }

  const seen = new Set<string>();
  for (const row of RATES) {
    for (const s of row.sources) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      items.push({ title: s.label, detail: '4대 사회보험 요율·상하한', url: s.url, checkedAt: s.checkedAt });
    }
  }

  items.push({
    title: '근로기준법 · 근로자퇴직급여보장법',
    detail: '퇴직금·연차수당 산식',
  });

  return (
    <main className="screen">
      <ul className="list list--plain">
        {items.map((it) => (
          <li key={it.title} className="list__item list__item--stack">
            <span className="list__name">{it.title}</span>
            <span className="list__sub">{it.detail}</span>
            {it.checkedAt && <span className="list__sub">{t('sources.checkedAt', { date: it.checkedAt })}</span>}
            {it.url && (
              <a className="list__link" href={it.url}>
                {it.url}
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="hint">{t('sources.notAffiliated')}</p>
    </main>
  );
}
