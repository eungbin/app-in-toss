import { t } from '@/i18n';
import { BASE_RATE, SERIES } from '@/data';
import { fmtDate } from '@/engine/scenario';

const STAT_NAMES: Record<string, string> = {
  '731Y003': 'ECOS>3.1.1.3. 원화의 대미달러, 원화의 대위안/대엔 환율',
  '722Y001': 'ECOS>1.3.1. 한국은행 기준금리 및 여수신금리',
};

export function Sources() {
  const entries = [
    ...Object.values(SERIES).map((s) => ({
      label: s.name,
      stat: s.source.stat,
      fetchedAt: s.source.fetchedAt,
      first: s.candles[0]?.d ?? '',
      last: s.candles[s.candles.length - 1]?.d ?? '',
    })),
    {
      label: '한국은행 기준금리',
      stat: BASE_RATE.source.stat,
      fetchedAt: BASE_RATE.source.fetchedAt,
      first: BASE_RATE.points[0]?.d ?? '',
      last: BASE_RATE.points[BASE_RATE.points.length - 1]?.d ?? '',
    },
  ];
  const seen = new Set<string>();

  return (
    <>
      <div className="scroll">
        <h1 className="screen-title">{t('sources.title')}</h1>
        <p className="body">{t('sources.intro')}</p>
        <div className="hr" />
        <ul className="timeline">
          {entries.map((e, i) => {
            const key = `${e.stat}-${e.first}`;
            if (seen.has(key)) return null;
            seen.add(key);
            return (
              <li key={i}>
                <div className="l" style={{ fontSize: 13 }}>{e.label}</div>
                <div className="b" style={{ fontSize: 12 }}>
                  자료 : {STAT_NAMES[e.stat] ?? e.stat} ({e.stat})
                </div>
                <div className="b">
                  수집일 {e.fetchedAt} · {fmtDate(e.first)} ~ {fmtDate(e.last)}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="sub" style={{ marginTop: 16 }}>{t('sources.link')}</p>
        <div className="hr" />
        <p className="body">{t('sources.license')}</p>
        <p className="body">{t('sources.disclaimer')}</p>
      </div>
    </>
  );
}
