/**
 * 복기 노트 상세 — docs/SCREEN_FLOW.md S08
 * 저장한 판을 다시 펼쳐 본다. 결과 화면과 같은 구성이되 읽기 전용이고,
 * 메모만 고칠 수 있다.
 */
import { useMemo, useState } from 'react';
import { barLabel, t } from '@/i18n';
import { MEMO_MAX, PLAY_BARS } from '@/constants';
import { SERIES, baseRatePointsOf, getCandles, getScenario } from '@/data';
import { CandleChart } from '@/components/CandleChart';
import { PrimaryButton, GhostButton } from '@/components/ui';
import { revealedWindow, windowRange } from '@/engine/normalize';
import { displayP } from '@/engine/position';
import { autoMarkers } from '@/engine/markers';
import { fmtDate } from '@/engine/scenario';
import { candleEnd } from '@/types';
import type { ReplayNote, ScenarioEvent } from '@/types';

interface Props {
  note: ReplayNote;
  onSaveMemo: (id: string, memo: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export function NoteDetail({ note, onSaveMemo, onDelete, onBack }: Props) {
  const { result } = note;
  const [memo, setMemo] = useState(note.memo);
  const [dirty, setDirty] = useState(false);

  const series = SERIES[result.series];
  const scenario = getScenario(result.scenarioId);
  // 이전 기록에는 timeframe·bars 가 없다. 시나리오나 기본값에서 되살린다.
  const timeframe = result.timeframe ?? scenario?.timeframe ?? 'day';
  const bars = result.bars ?? scenario?.bars ?? PLAY_BARS;

  const window = useMemo(() => {
    const candles = getCandles(result.series, timeframe);
    const startIdx = candles.findIndex((c) => c.d === result.startDate);
    if (startIdx < 0) return [];
    return revealedWindow(candles, startIdx, bars);
  }, [result.series, result.startDate, timeframe, bars]);

  const events: ScenarioEvent[] = useMemo(
    () => (scenario ? scenario.events : autoMarkers(window, baseRatePointsOf(), timeframe)),
    [scenario, window, timeframe],
  );

  const dayOf = (d: string) => window.findIndex((c) => candleEnd(c) >= d) + 1;
  const diff = displayP(result.diffP);
  const range = window.length > 0 ? windowRange(window) : null;

  return (
    <>
      <div className="scroll">
        <h1 className="screen-title">{scenario ? scenario.title : t('result.title')}</h1>
        <p className="body" style={{ marginBottom: 12 }}>
          {series.name} · {fmtDate(result.startDate)} ~ {fmtDate(result.endDate)}
        </p>

        {window.length > 0 ? (
          <>
            <CandleChart
              candles={window}
              slots={bars}
              labels={window.map((c) => fmtDate(c.d).slice(2))}
              markers={[
                ...events.map((e) => ({ day: dayOf(e.d), kind: 'event' as const })),
                ...result.conversions.map((c) => ({ day: c.day, kind: 'mine' as const })),
              ].filter((m) => m.day > 0)}
            />
            {range && (
              <div className="kv" style={{ fontSize: 13 }}>
                <span className="k">
                  {t('result.rangeLow')} {range.low.toLocaleString('ko-KR')}원
                </span>
                <span className="k">
                  {t('result.rangeHigh')} {range.high.toLocaleString('ko-KR')}원
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="empty">{t('error.dataLoad')}</p>
        )}

        <div className="card" style={{ marginTop: 16 }}>
          <div className="kv">
            <span className="k">{t('result.final')}</span>
            <span className="v">{displayP(result.finalP).toLocaleString('ko-KR')} P</span>
          </div>
          <div className="kv">
            <span className="k">{t('result.benchmark')}</span>
            <span className="v">{result.benchmarkP.toLocaleString('ko-KR')} P</span>
          </div>
          <div className="kv">
            <span className="k">{t('result.diff')}</span>
            <span className="v">
              {diff >= 0 ? '+' : ''}
              {diff.toLocaleString('ko-KR')} P
            </span>
          </div>
        </div>

        {result.conversions.length > 0 && (
          <>
            <div className="section">
              <h2>{t('result.myChoices')}</h2>
            </div>
            <ul className="timeline">
              {result.conversions.map((c, i) => {
                const bar = window[c.day - 1];
                const ev = bar ? events.find((e) => e.d === bar.d) : undefined;
                return (
                  <li key={i}>
                    <div className="d">
                      {barLabel(timeframe, c.day)} · {bar ? fmtDate(bar.d) : ''}
                    </div>
                    <div className="l">
                      {c.dir === 'toFx' ? t('play.toFx') : t('play.toKrw')} {c.ratio}%
                    </div>
                    {ev && <div className="b">{t('result.thatDay', { event: ev.label })}</div>}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {events.length > 0 && (
          <>
            <div className="section">
              <h2>{t('result.whatHappened')}</h2>
            </div>
            <ul className="timeline">
              {events.map((e, i) => (
                <li key={i}>
                  <div className="d">{fmtDate(e.d)}</div>
                  <div className="l">{e.label}</div>
                  {e.body && <div className="b">{e.body}</div>}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="section">
          <h2>{t('note.memo')}</h2>
        </div>
        <textarea
          className="memo"
          rows={2}
          maxLength={MEMO_MAX}
          placeholder={t('result.memoPlaceholder')}
          value={memo}
          onChange={(e) => {
            setMemo(e.target.value.replace(/\n/g, ''));
            setDirty(true);
          }}
        />

        <p className="source">
          {t('result.source', { series: series.name, date: series.source.fetchedAt })}
        </p>
      </div>

      <div className="bottom">
        <PrimaryButton
          disabled={!dirty}
          onClick={() => {
            onSaveMemo(note.id, memo);
            setDirty(false);
          }}
        >
          {dirty ? t('note.save') : t('result.saved')}
        </PrimaryButton>
        <GhostButton
          style={{ color: 'var(--up)' }}
          onClick={() => {
            onDelete(note.id);
            onBack();
          }}
        >
          {t('history.delete')}
        </GhostButton>
      </div>
    </>
  );
}
