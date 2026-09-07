import { useCallback, useMemo, useState } from 'react';
import { t } from '@/i18n';
import { SERIES, baseRatePointsOf, getCandles, getScenario } from '@/data';
import { MEMO_MAX } from '@/constants';
import { CandleChart } from '@/components/CandleChart';
import { revealedWindow, windowRange } from '@/engine/normalize';
import { displayP } from '@/engine/position';
import { autoMarkers, dailyDebrief } from '@/engine/markers';
import { fmtDate } from '@/engine/scenario';
import { renderShareCard, shareHeadline } from '@/components/shareCard';
import { canSaveImage, saveCardImage, shareLink } from '@ait/kit';
import { candleEnd } from '@/types';
import type { PlayResult, PlaySession, ScenarioEvent } from '@/types';
import { PrimaryButton, SecondaryButton, GhostButton } from '@/components/ui';

interface Props {
  session: PlaySession;
  result: PlayResult;
  saved: boolean;
  onSave: (memo: string) => void;
  onAgain: () => void;
  onHome: () => void;
  onDebrief?: () => void;
  onToast: (msg: string) => void;
}

export function Result({
  session,
  result,
  saved,
  onSave,
  onAgain,
  onHome,
  onDebrief,
  onToast,
}: Props) {
  const [memo, setMemo] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const series = SERIES[session.series];
  const candles = getCandles(session.series, session.timeframe);
  const window = useMemo(
    () => revealedWindow(candles, session.startIdx, session.bars),
    [candles, session.startIdx, session.bars],
  );
  const scenario = getScenario(session.scenarioId);
  const events: ScenarioEvent[] = useMemo(
    () => (scenario ? scenario.events : autoMarkers(window, baseRatePointsOf(), session.timeframe)),
    [scenario, window, session.timeframe],
  );
  const dayOf = (d: string) => window.findIndex((c) => candleEnd(c) >= d) + 1;
  const { high, low } = windowRange(window);
  const diff = displayP(result.diffP);
  const sourceLine = t('result.source', {
    series: series.name,
    date: series.source.fetchedAt,
  });

  const cardInput = useCallback(
    () => ({
      candles: window,
      conversions: result.conversions,
      assetName: series.name,
      startDate: result.startDate,
      endDate: result.endDate,
      sourceLine,
      appName: t('app.name'),
    }),
    [window, result, series.name, sourceLine],
  );

  const onSaveImage = useCallback(async () => {
    if (!canSaveImage()) {
      onToast(t('share.unsupported'));
      return;
    }
    try {
      const base64 = renderShareCard(cardInput());
      if (!base64) throw new Error('render failed');
      await saveCardImage(base64, `fx-replay-${result.startDate}.png`);
      onToast(t('share.saved'));
    } catch {
      onToast(t('share.failed'));
    }
    setShareOpen(false);
  }, [cardInput, onToast, result.startDate]);

  const onSendLink = useCallback(async () => {
    try {
      const path = scenario ? `/scenario/${scenario.id}` : '/';
      await shareLink(
        'fx-replay',
        path,
        `${shareHeadline(result.startDate)} · ${t('share.text')}`,
      );
    } catch {
      onToast(t('share.failed'));
    }
    setShareOpen(false);
  }, [scenario, result.startDate, onToast]);

  return (
    <>
      <div className="scroll">
        <h1 className="screen-title">{t('result.title')}</h1>
        <h2 className="h1" style={{ fontSize: 18 }}>{series.name}</h2>
        <p className="body" style={{ marginBottom: 12 }}>
          {fmtDate(result.startDate)} ~ {fmtDate(result.endDate)}
        </p>

        <CandleChart
          candles={window}
          slots={session.bars}
          labels={window.map((c) => fmtDate(c.d).slice(2))}
          markers={[
            ...events.map((e) => ({ day: dayOf(e.d), kind: 'event' as const })),
            ...result.conversions.map((c) => ({ day: c.day, kind: 'mine' as const })),
          ].filter((m) => m.day > 0)}
        />
        <div className="kv" style={{ fontSize: 13 }}>
          <span className="k">{t('result.rangeLow')} {low.toLocaleString('ko-KR')}원</span>
          <span className="k">{t('result.rangeHigh')} {high.toLocaleString('ko-KR')}원</span>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="kv"><span className="k">{t('result.final')}</span>
            <span className="v">{displayP(result.finalP).toLocaleString('ko-KR')} P</span></div>
          <div className="kv"><span className="k">{t('result.benchmark')}</span>
            <span className="v">{result.benchmarkP.toLocaleString('ko-KR')} P</span></div>
          <div className="kv"><span className="k">{t('result.diff')}</span>
            <span className="v">{diff >= 0 ? '+' : ''}{diff.toLocaleString('ko-KR')} P</span></div>
        </div>

        {result.conversions.length > 0 && (
          <>
            <div className="section"><h2>{t('result.myChoices')}</h2></div>
            <ul className="timeline">
              {result.conversions.map((c, i) => {
                const day = window[c.day - 1];
                const ev = day ? events.find((e) => e.d === day.d) : undefined;
                return (
                  <li key={i}>
                    <div className="d">Day {c.day} · {day ? fmtDate(day.d) : ''}</div>
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
            <div className="section"><h2>{t('result.whatHappened')}</h2></div>
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

        <p className="body" style={{ marginTop: 20 }}>
          {scenario ? scenario.debrief.slice(0, 3).join(' ') : dailyDebrief(window, series.name)}
        </p>
        {scenario && onDebrief && (
          <GhostButton onClick={onDebrief}>{t('result.debriefMore')} ›</GhostButton>
        )}

        {!saved && (
          <textarea
            className="memo"
            rows={2}
            maxLength={MEMO_MAX}
            placeholder={t('result.memoPlaceholder')}
            value={memo}
            onChange={(e) => setMemo(e.target.value.replace(/\n/g, ''))}
          />
        )}

        <p className="source">{sourceLine}</p>
      </div>

      <div className="bottom">
        <div className="btn-row">
          <SecondaryButton disabled={saved} onClick={() => onSave(memo)}>
            {saved ? t('result.saved') : t('result.save')}
          </SecondaryButton>
          <PrimaryButton onClick={onAgain}>{t('result.again')}</PrimaryButton>
        </div>
        <div className="btn-row">
          <GhostButton onClick={() => setShareOpen(true)}>
            {t('result.share')}
          </GhostButton>
          <GhostButton onClick={onHome}>{t('result.home')}</GhostButton>
        </div>
      </div>

      {shareOpen && (
        <div className="sheet-bg" onClick={() => setShareOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>{t('share.title')}</h3>
            <p>{t('share.body')}</p>
            <PrimaryButton onClick={() => void onSaveImage()}>
              {t('share.saveImage')}
            </PrimaryButton>
            <SecondaryButton onClick={() => void onSendLink()}>
              {t('share.sendLink')}
            </SecondaryButton>
            <GhostButton onClick={() => setShareOpen(false)}>
              {t('m03.cancel')}
            </GhostButton>
          </div>
        </div>
      )}
    </>
  );
}
