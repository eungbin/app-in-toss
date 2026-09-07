import { progressLabel, t } from '@/i18n';
import { SCENARIOS, SERIES, isDevData } from '@/data';
import { available } from '@/engine/quota';
import { fmtMonth } from '@/engine/scenario';
import type { Store } from '@/store';
import { BannerAd } from '@/components/BannerAd';
import type { Scenario } from '@/types';

interface Props {
  store: Store;
  onStartDaily: () => void;
  onResume: () => void;
  onQuit: () => void;
  onScenarios: () => void;
  onScenario: (s: Scenario) => void;
  onHistory: () => void;
  onSettings: () => void;
}

export function Home(p: Props) {
  const { state } = p.store;
  const left = available(state.quota, state.entitlements.premium);
  const remaining = Number.isFinite(left)
    ? t('home.daily.remaining', { n: left })
    : t('home.daily.unlimited');
  // 무료 챕터를 먼저 보여 준다
  const preview = [...SCENARIOS]
    .sort((a, b) => Number(b.free) - Number(a.free) || a.start.localeCompare(b.start))
    .slice(0, 3);
  const lastNote = state.notes[0];

  return (
    <>
      {isDevData && <div className="dev-banner">개발용 합성 데이터입니다 (실제 시세 아님)</div>}
      <div className="scroll">
        <h1 className="h1">{t('home.h1')}</h1>
        <p className="body">{t('home.body')}</p>

        {state.session && (
          <div className="card">
            <h3>{t('home.resume.title')}</h3>
            <p className="sub">
              {progressLabel(state.session.timeframe, state.session.day, state.session.bars)}
            </p>
            <button className="btn" onClick={p.onResume}>{t('home.resume.cta')}</button>
            <button className="btn ghost" onClick={p.onQuit}>{t('home.resume.quit')}</button>
          </div>
        )}

        <div className="card">
          <h3>{t('home.daily.title')}</h3>
          <p className="sub">{t('home.daily.sub')} · {remaining}</p>
          <button className="btn" onClick={p.onStartDaily}>{t('home.daily.cta')}</button>
        </div>

        <div className="section">
          <h2>{t('home.section.scenarios')}</h2>
          <button onClick={p.onScenarios}>{t('home.more')} ›</button>
        </div>
        <div className="hcards">
          {preview.map((s) => (
            <button key={s.id} className="card" onClick={() => p.onScenario(s)} style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: 14 }}>{s.title}</h3>
              <p className="sub" style={{ margin: '4px 0 8px' }}>{fmtMonth(s.start)}</p>
              <span className={s.free ? 'badge' : 'badge gray'}>
                {s.free ? t('scen.badge.free') : t('scen.badge.soon')}
              </span>
            </button>
          ))}
        </div>

        <div className="section">
          <h2>{t('home.section.history')}</h2>
          <button onClick={p.onHistory}>{t('home.all')} ›</button>
        </div>
        {lastNote ? (
          <button className="card" onClick={p.onHistory} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
            <h3 style={{ fontSize: 14 }}>
              {fmtMonth(lastNote.result.startDate)} {SERIES[lastNote.result.series].name}
            </h3>
            <p className="sub" style={{ margin: 0 }}>
              {lastNote.memo || `전환 ${lastNote.result.conversions.length}회`}
            </p>
          </button>
        ) : (
          <div className="card"><p className="sub" style={{ margin: 0 }}>{t('history.empty')}</p></div>
        )}

        <button className="row-link" onClick={p.onSettings}>
          {t('settings.title')} ›
        </button>

        <BannerAd hidden={state.entitlements.premium} />
      </div>
    </>
  );
}
