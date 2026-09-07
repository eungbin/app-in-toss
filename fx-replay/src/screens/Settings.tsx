import { useState } from 'react';
import { t } from '@/i18n';
import { SERIES, isDevData } from '@/data';
import type { Settings as SettingsType } from '@/store';

interface Props {
  settings: SettingsType;
  onChange: (patch: Partial<SettingsType>) => void;
  onSources: () => void;
  onClear: () => void;
}

export function Settings({ settings, onChange, onSources, onClear }: Props) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <div className="scroll">
        <h1 className="screen-title">{t('settings.title')}</h1>
        <div className="kv">
          <span className="k">{t('settings.speed')}</span>
          <span className="speed">
            {([1, 2] as const).map((sp) => (
              <button key={sp} data-on={settings.speed === sp} onClick={() => onChange({ speed: sp })}
                style={{ padding: '6px 10px' }}>
                {sp}x
              </button>
            ))}
          </span>
        </div>
        <div className="kv">
          <span className="k">{t('settings.revealAnim')}</span>
          <button onClick={() => onChange({ revealAnim: !settings.revealAnim })}>
            {settings.revealAnim ? '켬' : '끔'}
          </button>
        </div>
        <div className="hr" />
        <button className="btn ghost" style={{ textAlign: 'left' }} onClick={onSources}>
          {t('settings.sources')} ›
        </button>
        <div className="hr" />
        <p className="sub">{t('settings.contact')}</p>
        <button className="btn ghost" style={{ textAlign: 'left', color: 'var(--up)' }}
          onClick={() => setConfirming(true)}>
          {t('settings.clear')}
        </button>
        <p className="source">
          {t('settings.version', { version: '0.1.0', date: SERIES.usdkrw.source.fetchedAt })}
          {isDevData && ' · 개발용 합성 데이터'}
        </p>
      </div>
      {confirming && (
        <div className="sheet-bg" onClick={() => setConfirming(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>{t('settings.clear')}</h3>
            <p>{t('settings.clearConfirm')}</p>
            <button className="btn" onClick={() => { onClear(); setConfirming(false); }}>
              {t('settings.clear')}
            </button>
            <button className="btn ghost" onClick={() => setConfirming(false)}>{t('play.leaveCancel')}</button>
          </div>
        </div>
      )}
    </>
  );
}
