import { useCallback, useEffect, useRef, useState } from 'react';
import { pushBackHandler } from '@/platform/backstack';
import { t } from '@/i18n';
import { SERIES, getCandles } from '@/data';
import { CandleChart } from '@/components/CandleChart';
import { blindWindow, revealedWindow } from '@/engine/normalize';
import { canConvert, displayP, totalP } from '@/engine/position';
import { convert, currentRate, pause, setSpeed, start, tick } from '@/engine/session';
import { fmtDate } from '@/engine/scenario';
import type { ConvertDir, ConvertRatio, PlaySession, Timeframe } from '@/types';

const unitLabel = (tf: Timeframe) => t(`play.unit.${tf}` as 'play.unit.day');

interface Props {
  session: PlaySession;
  onChange: (s: PlaySession) => void;
  onFinish: () => void;
}

export function Play({ session, onChange, onFinish }: Props) {
  const candles = getCandles(session.series, session.timeframe);
  const [sheet, setSheet] = useState<ConvertDir | null>(null);
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

  // 타이머
  useEffect(() => {
    if (session.status !== 'playing' || sheet !== null) return undefined;
    const id = setTimeout(
      () => onChange(tick(sessionRef.current, new Date().toISOString())),
      session.tickMs / session.speed,
    );
    return () => clearTimeout(id);
  }, [session.status, session.day, session.speed, session.tickMs, sheet, onChange]);

  // 전환 시트가 열려 있으면 뒤로가기는 시트만 닫는다
  useEffect(() => {
    if (sheet === null) return undefined;
    return pushBackHandler(() => {
      closeSheetRef.current(null);
      return true;
    });
  }, [sheet]);

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

  const finished = session.status === 'finished' || session.status === 'revealed';
  const paused = session.status === 'paused';

  return (
    <>
      <div className="scroll">
        <p className="day-counter">
          {session.blind ? '' : `${SERIES[session.series].name} · `}
          {unitLabel(session.timeframe)} {session.day} / {session.bars}
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
          slots={session.bars}
          labels={labels}
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
          <button className="btn" onClick={onFinish}>{t('play.finishedCta')}</button>
        ) : (
          <div className="ctrl">
            <button className="btn sub" style={{ width: 'auto', padding: '0 20px' }}
              onClick={() => onChange(
                session.status === 'playing'
                  ? pause(sessionRef.current, new Date().toISOString())
                  : start(sessionRef.current, new Date().toISOString()),
              )}>
              {session.status === 'playing' ? t('play.pause') : t('play.resume')}
            </button>
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
