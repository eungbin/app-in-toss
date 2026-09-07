import { useCallback, useEffect, useRef, useState } from 'react';
import { pushBackHandler } from '@ait/kit';
import { barPrefix, progressLabel, t } from '@/i18n';
import { LEAD_IN_BARS } from '@/constants';
import { SERIES, getCandles } from '@/data';
import { CandleChart } from '@/components/CandleChart';
import { blindWindow, leadInWindow, revealedWindow } from '@/engine/normalize';
import { canConvert, displayP, totalP } from '@/engine/position';
import { convert, currentRate, pause, setSpeed, start, tick } from '@/engine/session';
import { fmtDate } from '@/engine/scenario';
import type { ConvertDir, ConvertRatio, PlaySession, ScenarioEvent } from '@/types';
import { PrimaryButton, SecondaryButton } from '@/components/ui';

interface Props {
  session: PlaySession;
  onChange: (s: PlaySession) => void;
  onFinish: () => void;
  /** 봉 번호 → 그 봉에 걸린 사건. 챕터에서만 채워진다 */
  eventsByBar: Map<number, ScenarioEvent[]>;
  pauseOnEvent: boolean;
}

export function Play({ session, onChange, onFinish, eventsByBar, pauseOnEvent }: Props) {
  const candles = getCandles(session.series, session.timeframe);
  const [sheet, setSheet] = useState<ConvertDir | null>(null);
  const [eventStop, setEventStop] = useState<ScenarioEvent[] | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // 자동 시작
  useEffect(() => {
    if (session.status === 'ready') {
      const id = setTimeout(() => onChange(start(sessionRef.current, new Date().toISOString())), 500);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [session.status, onChange]);

  /**
   * 사건 당일 자동 정지 — docs/FUNCTIONAL_SPEC.md §3-3
   * 블라인드에서는 사건이 날짜·자산을 노출하므로 적용하지 않는다.
   * 봉 번호가 바뀔 때 한 번만 검사해, 재개 후 같은 봉에서 다시 멈추지 않는다.
   */
  const checkedBarRef = useRef(0);
  useEffect(() => {
    if (!pauseOnEvent || session.blind) return;
    if (session.status !== 'playing' && session.status !== 'ready') return;
    if (session.day === checkedBarRef.current) return;
    checkedBarRef.current = session.day;
    const hits = eventsByBar.get(session.day);
    if (hits && hits.length > 0) {
      onChange(pause(sessionRef.current, new Date().toISOString()));
      setEventStop(hits);
    }
  }, [session.day, session.status, session.blind, pauseOnEvent, eventsByBar, onChange]);

  // 타이머
  useEffect(() => {
    if (session.status !== 'playing' || sheet !== null || eventStop !== null) return undefined;
    const id = setTimeout(
      () => onChange(tick(sessionRef.current, new Date().toISOString())),
      session.tickMs / session.speed,
    );
    return () => clearTimeout(id);
  }, [session.status, session.day, session.speed, session.tickMs, sheet, eventStop, onChange]);

  // 전환 시트가 열려 있으면 뒤로가기는 시트만 닫는다
  useEffect(() => {
    if (sheet === null) return undefined;
    return pushBackHandler(() => {
      closeSheetRef.current(null);
      return true;
    });
  }, [sheet]);

  // 사건 시트가 떠 있으면 뒤로가기는 시트만 닫는다
  useEffect(() => {
    if (eventStop === null) return undefined;
    return pushBackHandler(() => {
      dismissEventRef.current();
      return true;
    });
  }, [eventStop]);

  // 백그라운드 전환 시 일시정지
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        onChange(pause(sessionRef.current, new Date().toISOString()));
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [onChange]);

  const rate = currentRate(session, candles);
  const total = totalP(session.holdings, rate);
  const window = session.blind
    ? blindWindow(candles, session.startIdx, session.day)
    : revealedWindow(candles, session.startIdx, session.day);
  /**
   * 미래 영역도 진행에 따라 늘린다. 처음부터 60칸을 잡아두면 초반에 대부분이 빈 격자다.
   * 앞으로 6칸 여유를 두고, 최소 20칸에서 시작해 bars 까지 늘어난다.
   */
  const visibleSlots = Math.min(session.bars, Math.max(session.day + 6, 20));
  const base = candles[session.startIdx]?.c ?? 1;
  const leadIn = leadInWindow(candles, session.startIdx, LEAD_IN_BARS, session.blind, base);
  const cur = window[window.length - 1];
  const first = window[0];
  const changePct = cur && first ? ((cur.c - first.c) / first.c) * 100 : 0;
  const labels = session.blind
    ? undefined
    : revealedWindow(candles, session.startIdx, session.day).map((c) => fmtDate(c.d).slice(2));

  /** 체결 후 재생을 재개한다 — docs/SCREEN_FLOW.md M02 */
  const closeSheet = useCallback(
    (converted: { dir: ConvertDir; ratio: ConvertRatio } | null) => {
      const now = new Date().toISOString();
      const afterConvert = converted
        ? convert(sessionRef.current, candles, converted.dir, converted.ratio, now)
        : sessionRef.current;
      onChange(afterConvert.status === 'paused' ? start(afterConvert, now) : afterConvert);
      setSheet(null);
    },
    [candles, onChange],
  );
  const closeSheetRef = useRef(closeSheet);
  closeSheetRef.current = closeSheet;

  /**
   * 사건 시트를 닫아도 재생은 멈춘 채로 둔다.
   * 바로 재개하면 사건을 읽는 순간이 지나가 버려 판단 지점이 생기지 않는다.
   * 사용자가 전환하거나 재생 버튼을 누를 때까지 기다린다.
   */
  const dismissEvent = useCallback(() => setEventStop(null), []);
  const dismissEventRef = useRef(dismissEvent);
  dismissEventRef.current = dismissEvent;

  const finished = session.status === 'finished' || session.status === 'revealed';
  const paused = session.status === 'paused';

  return (
    <>
      <div className="scroll">
        <p className="day-counter">
          {session.blind ? '' : `${SERIES[session.series].name} · `}
          {progressLabel(session.timeframe, session.day, session.bars)}
        </p>
        <div className="play-head">
          <div>
            <div className="asset">
              {session.blind ? t('play.asset.blind') : SERIES[session.series].name}
            </div>
            <div className="val">
              {cur ? cur.c.toLocaleString('ko-KR', { maximumFractionDigits: session.blind ? 1 : 2 }) : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="asset">{t('play.vsStart')}</div>
            <div className="val" style={{ fontSize: 18, color: changePct >= 0 ? 'var(--up)' : 'var(--down)' }}>
              {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
            </div>
          </div>
        </div>

        <CandleChart
          candles={window}
          slots={visibleSlots}
          leadIn={leadIn}
          unitPrefix={barPrefix(session.timeframe)}
          {...(labels ? { labels } : {})}
          markers={session.conversions.map((c) => ({ day: c.day, kind: 'mine' as const }))}
        />
        {paused && <p className="sub" style={{ textAlign: 'center' }}>{t('play.paused')}</p>}

        <div className="hr" />
        <div className="kv"><span className="k">{t('play.points')}</span>
          <span className="v">{displayP(total).toLocaleString('ko-KR')} P</span></div>
        <div className="kv"><span className="k">{t('play.krw')}</span>
          <span className="v">{displayP(session.holdings.krw).toLocaleString('ko-KR')} P</span></div>
        <div className="kv"><span className="k">{t('play.fx')}</span>
          <span className="v">{displayP(session.holdings.fx * rate).toLocaleString('ko-KR')} P</span></div>

        {!finished && (
          <>
            <div className="chip-row">
              <button className="chip" disabled={!canConvert(session.holdings, 'toFx', rate)}
                onClick={() => { onChange(pause(sessionRef.current, new Date().toISOString())); setSheet('toFx'); }}>
                {t('play.toFx')}
              </button>
              <button className="chip" disabled={!canConvert(session.holdings, 'toKrw', rate)}
                onClick={() => { onChange(pause(sessionRef.current, new Date().toISOString())); setSheet('toKrw'); }}>
                {t('play.toKrw')}
              </button>
            </div>
            <p className="sub" style={{ textAlign: 'center', marginTop: 10, fontSize: 13 }}>
              {t('play.holdHint')}
            </p>
          </>
        )}
      </div>

      <div className="bottom">
        {finished ? (
          <PrimaryButton onClick={onFinish}>{t('play.finishedCta')}</PrimaryButton>
        ) : (
          <div className="ctrl">
            <SecondaryButton style={{ width: 'auto', padding: '0 20px' }}
              onClick={() => onChange(
                session.status === 'playing'
                  ? pause(sessionRef.current, new Date().toISOString())
                  : start(sessionRef.current, new Date().toISOString()),
              )}>
              {session.status === 'playing' ? t('play.pause') : t('play.resume')}
            </SecondaryButton>
            <div className="speed">
              {([1, 2] as const).map((sp) => (
                <button key={sp} data-on={session.speed === sp}
                  onClick={() => onChange(setSpeed(sessionRef.current, sp, new Date().toISOString()))}>
                  {sp}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {eventStop && (
        <div className="sheet-bg">
          <div className="sheet">
            <h3>{t('event.title')}</h3>
            <ul className="timeline" style={{ marginBottom: 20 }}>
              {eventStop.map((e, i) => (
                <li key={i}>
                  <div className="d">{fmtDate(e.d)}</div>
                  <div className="l">{e.label}</div>
                  {e.body && <div className="b">{e.body}</div>}
                </li>
              ))}
            </ul>
            <p className="sub" style={{ margin: '0 0 16px', fontSize: 13 }}>
              {t('event.hint')}
            </p>
            <PrimaryButton onClick={dismissEvent}>
              {t('event.continue')}
            </PrimaryButton>
          </div>
        </div>
      )}

      {sheet && (
        <div className="sheet-bg" onClick={() => closeSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>{sheet === 'toFx' ? t('m02.titleToFx') : t('m02.titleToKrw')}</h3>
            <p>{t('m02.body', {
              asset: sheet === 'toFx' ? t('play.krw') : t('play.fx'),
              amount: displayP(sheet === 'toFx' ? session.holdings.krw : session.holdings.fx * rate).toLocaleString('ko-KR'),
            })}</p>
            <div className="btn-row">
              {([25, 50, 100] as const).map((r) => (
                <button key={r} className="btn sub" onClick={() => closeSheet({ dir: sheet, ratio: r })}>
                  {r === 100 ? t('m02.all') : `${r}%`}
                </button>
              ))}
            </div>
            <p className="sub" style={{ marginTop: 16, marginBottom: 0, fontSize: 13 }}>{t('m02.hint')}</p>
          </div>
        </div>
      )}

    </>
  );
}
