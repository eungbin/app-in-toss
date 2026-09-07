import { t } from '@/i18n';
import { SERIES } from '@/data';
import { fmtDate } from '@/engine/scenario';
import type { Scenario } from '@/types';

interface Props {
  scenario: Scenario;
  owned: boolean;
  onPlay: () => void;
}

export function Chapter({ scenario: s, owned, onPlay }: Props) {
  return (
    <>
      <div className="scroll">
        <h1 className="screen-title">{s.title}</h1>
        <p className="sub">
          {t('chapter.meta', {
            series: SERIES[s.series].name,
            start: fmtDate(s.start),
            days: `${s.bars}${t(`scen.unit.${s.timeframe ?? 'day'}` as 'scen.unit.day')}`,
          })}
        </p>
        <p className="sub">
          {t('chapter.counts', { events: s.events.length, debrief: s.debrief.length })}
        </p>
        <div className="hr" />
        {s.intro.map((line, i) => (
          <p className="body" key={i} style={{ marginBottom: 8 }}>{line}</p>
        ))}
        <div className="section"><h2>{t('chapter.what')}</h2></div>
        <ul className="timeline">
          <li>
            <div className="l">
              {t(`chapter.point1.${s.timeframe ?? 'day'}` as 'chapter.point1.day', { n: s.bars })}
            </div>
          </li>
          <li><div className="l">{t('chapter.point2')}</div></li>
          <li><div className="l">{t('chapter.point3')}</div></li>
        </ul>
      </div>
      <div className="bottom">
        <button className="btn" disabled={!owned} onClick={onPlay}>
          {owned ? t('chapter.ctaPlay') : t('chapter.ctaSoon')}
        </button>
      </div>
    </>
  );
}
