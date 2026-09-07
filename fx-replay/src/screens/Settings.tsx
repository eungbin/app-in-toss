import { useState } from 'react';
import { t } from '@/i18n';
import { SERIES, isDevData } from '@/data';
import type { Settings as SettingsType } from '@/store';
import { PrimaryButton, GhostButton } from '@/components/ui';

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
        <div className="kv">
          <span className="k">
            {t('settings.pauseOnEvent')}
            <br />
            <span className="sub" style={{ fontSize: 12 }}>{t('settings.pauseOnEventHint')}</span>
          </span>
          <button onClick={() => onChange({ pauseOnEvent: !settings.pauseOnEvent })}>
            {settings.pauseOnEvent ? '켬' : '끔'}
          </button>
        </div>
        <div className="hr" />
        <button className="row-link" onClick={onSources}>
          <span>{t('settings.sources')}</span>
          <span className="chev">›</span>
        </button>
        <button className="row-link" onClick={() => setConfirming(true)} data-danger>
          <span>{t('settings.clear')}</span>
        </button>
        <div className="hr" />
        <div className="kv">
          <span className="k">{t('settings.contact')}</span>
          <span className="v" style={{ fontWeight: 400, color: 'var(--sub)' }}>
            support@example.com
          </span>
        </div>
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
            <PrimaryButton onClick={() => { onClear(); setConfirming(false); }}>
              {t('settings.clear')}
            </PrimaryButton>
            <GhostButton onClick={() => setConfirming(false)}>{t('play.leaveCancel')}</GhostButton>
          </div>
        </div>
      )}
    </>
  );
}
