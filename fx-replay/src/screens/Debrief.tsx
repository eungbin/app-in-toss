import { t } from '@/i18n';
import { SERIES } from '@/data';
import { displayP } from '@/engine/position';
import { fmtDate } from '@/engine/scenario';
import type { PlayResult, Scenario } from '@/types';
import { PrimaryButton } from '@/components/ui';

interface Props {
  scenario: Scenario;
  result?: PlayResult;
  onReplay: () => void;
}

export function Debrief({ scenario: s, result, onReplay }: Props) {
  const series = SERIES[s.series];
  return (
    <>
      <div className="scroll">
        <h1 className="screen-title">{s.title} · {t('debrief.title')}</h1>
        {result && (
          <div className="kv">
            <span className="k">{t('debrief.myResult')}</span>
            <span className="v">
              {displayP(result.finalP).toLocaleString('ko-KR')} P · 전환 {result.conversions.length}회
            </span>
          </div>
        )}
        <div className="section"><h2>{t('debrief.timeline')}</h2></div>
        <ul className="timeline">
          {s.events.map((e, i) => (
            <li key={i}>
              <div className="d">{fmtDate(e.d)}</div>
              <div className="l">{e.label}</div>
              {e.body && <div className="b">{e.body}</div>}
            </li>
          ))}
        </ul>
        <div className="section"><h2>{t('debrief.record')}</h2></div>
        {s.debrief.map((line, i) => (
          <p className="body" key={i} style={{ marginBottom: 8 }}>{line}</p>
        ))}
        {s.sources && s.sources.length > 0 && (
          <>
            <div className="section"><h2>{t('debrief.refs')}</h2></div>
            <ul className="timeline">
              {s.sources.map((src, i) => <li key={i}><div className="b">{src}</div></li>)}
            </ul>
          </>
        )}
        <p className="source">
          {t('result.source', { series: series.name, date: series.source.fetchedAt })}
        </p>
      </div>
      <div className="bottom">
        <PrimaryButton onClick={onReplay}>{t('chapter.replay')}</PrimaryButton>
      </div>
    </>
  );
}
