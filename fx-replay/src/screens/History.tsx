import { useState } from 'react';
import { t } from '@/i18n';
import { SERIES } from '@/data';
import { displayP } from '@/engine/position';
import { fmtDate, fmtMonth } from '@/engine/scenario';
import { BADGES } from '@/engine/badges';
import { BannerAd } from '@/components/BannerAd';
import type { Badge, PlayResult, ReplayNote } from '@/types';

interface Props {
  notes: ReplayNote[];
  history: PlayResult[];
  badges: Badge[];
  onDeleteNote: (id: string) => void;
  premium: boolean;
}

export function History({ notes, history, badges, onDeleteNote, premium }: Props) {
  const [tab, setTab] = useState<'notes' | 'badges' | 'plays'>('notes');
  const earned = new Set(badges.map((b) => b.id));

  return (
    <>
      <div className="scroll">
        <h1 className="screen-title">{t('history.title')}</h1>
        <p className="sub">
          {t('history.summary', { plays: history.length, notes: notes.length, badges: badges.length })}
        </p>
        <div className="tabs">
          {(['notes', 'badges', 'plays'] as const).map((k) => (
            <button key={k} data-on={tab === k} onClick={() => setTab(k)}>
              {t(`history.tab.${k}` as 'history.tab.notes')}
            </button>
          ))}
        </div>

        {tab === 'notes' && (
          notes.length === 0 ? <p className="empty">{t('history.empty')}</p> : (
            <>
              {notes.map((n) => (
                <div className="card" key={n.id}>
                  <h3 style={{ fontSize: 14 }}>
                    {fmtMonth(n.result.startDate)} {SERIES[n.result.series].name}
                  </h3>
                  {n.memo && <p className="sub" style={{ margin: '4px 0' }}>“{n.memo}”</p>}
                  <p className="sub" style={{ margin: 0 }}>
                    {t('result.diff')} {displayP(n.result.diffP) >= 0 ? '+' : ''}
                    {displayP(n.result.diffP).toLocaleString('ko-KR')} P
                  </p>
                  <button className="btn ghost" onClick={() => onDeleteNote(n.id)}>{t('history.delete')}</button>
                </div>
              ))}
              <p className="sub" style={{ textAlign: 'center' }}>{t('history.noteLimit')}</p>
            </>
          )
        )}

        {tab === 'badges' && (
          <ul className="timeline">
            {BADGES.map((b) => (
              <li key={b.id} style={{ opacity: earned.has(b.id) ? 1 : 0.45 }}>
                <div className="l">{t(`badge.${b.id}` as 'badge.first_reveal')}</div>
                <div className="b">{earned.has(b.id) ? '획득' : b.hint}</div>
              </li>
            ))}
          </ul>
        )}

        {tab === 'plays' && (
          history.length === 0 ? <p className="empty">{t('history.empty')}</p> : (
            <ul className="timeline">
              {history.map((h) => (
                <li key={h.sessionId}>
                  <div className="d">{fmtDate(h.startDate)} ~ {fmtDate(h.endDate)}</div>
                  <div className="l">{SERIES[h.series].name}</div>
                  <div className="b">
                    {t('result.diff')} {displayP(h.diffP) >= 0 ? '+' : ''}
                    {displayP(h.diffP).toLocaleString('ko-KR')} P
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        <BannerAd hidden={premium} />
      </div>
    </>
  );
}
