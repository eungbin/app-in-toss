import { t } from '@/i18n';
import { SCENARIOS, SERIES } from '@/data';
import { fmtMonth } from '@/engine/scenario';
import type { Entitlements, PlayResult, Scenario } from '@/types';

interface Props {
  entitlements: Entitlements;
  history: PlayResult[];
  onSelect: (s: Scenario) => void;
}

export function ownsChapter(e: Entitlements, s: Scenario): boolean {
  return s.free || e.premium || e.chapters.includes(s.id);
}

export function Scenarios({ entitlements, history, onSelect }: Props) {
  const sorted = [...SCENARIOS].sort((a, b) => {
    const rank = (s: Scenario) => (s.free ? 0 : ownsChapter(entitlements, s) ? 1 : 2);
    return rank(a) - rank(b) || a.start.localeCompare(b.start);
  });

  return (
    <>
      <div className="scroll">
        <h1 className="screen-title">{t('scen.title')}</h1>
        <p className="body">{t('scen.body')}</p>
        {sorted.map((s) => {
          const owned = ownsChapter(entitlements, s);
          const played = history.filter((h) => h.scenarioId === s.id).length;
          return (
            <button key={s.id} className="card" onClick={() => onSelect(s)}
              style={{ display: 'block', width: '100%', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>{s.title}</h3>
                <span className={s.free ? 'badge' : owned ? 'badge' : 'badge gray'}>
                  {s.free ? t('scen.badge.free') : owned ? t('scen.badge.owned') : t('scen.badge.soon')}
                </span>
              </div>
              <p className="sub" style={{ margin: '4px 0 0' }}>
                {t('scen.meta', {
                  series: SERIES[s.series].name,
                  range: fmtMonth(s.start),
                  days: `${s.bars}${t(`scen.unit.${s.timeframe ?? 'day'}` as 'scen.unit.day')}`,
                })}
              </p>
              {played > 0 && <p className="sub" style={{ margin: 0 }}>{t('scen.played', { n: played })}</p>}
            </button>
          );
        })}
      </div>
    </>
  );
}
