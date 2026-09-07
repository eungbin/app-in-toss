import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '@/i18n';
import { PLAY_BARS } from '@/constants';
import { SCENARIOS, chaptersOf, ensureSeries, getCandles, getScenario } from '@/data';
import { useAppStore } from '@/store';
import { available, consume, grantBonus } from '@/engine/quota';
import { buildResult, createSession, isSessionValid, reveal, start } from '@/engine/session';
import { newlyEarned } from '@/engine/badges';
import { mapEventsToBars } from '@/engine/events';
import { dailyScenarioId, pickSegment } from '@/engine/segment';
import { resolveRange } from '@/engine/scenario';
import { preloadRewarded, showRewarded, type RewardedState } from '@ait/kit';
import { closeApp, onBack } from '@ait/kit';
import { pushBackHandler, runBackHandlers } from '@ait/kit';
import { pause } from '@/engine/session';
import { Home } from '@/screens/Home';
import { Play } from '@/screens/Play';
import { Result } from '@/screens/Result';
import { Scenarios, ownsChapter } from '@/screens/Scenarios';
import { Chapter } from '@/screens/Chapter';
import { Debrief } from '@/screens/Debrief';
import { History } from '@/screens/History';
import { Settings } from '@/screens/Settings';
import { Sources } from '@/screens/Sources';
import { TabBar, isTabRoute, type TabName } from '@/components/TabBar';
import type { PlayResult, PlaySession, Scenario } from '@/types';
import { PrimaryButton, GhostButton } from '@/components/ui';

type Route =
  | { name: 'home' }
  | { name: 'play' }
  | { name: 'result'; result: PlayResult; session: PlaySession }
  | { name: 'scenarios' }
  | { name: 'chapter'; id: string }
  | { name: 'debrief'; id: string }
  | { name: 'history' }
  | { name: 'settings' }
  | { name: 'sources' };

export function App() {
  const store = useAppStore();
  const { state } = store;
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [adState, setAdState] = useState<RewardedState>('idle');
  const [showQuotaSheet, setShowQuotaSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const routeRef = useRef(route);
  routeRef.current = route;

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  /**
   * 토스 네비게이션 바·안드로이드 백버튼 처리 — docs/FUNCTIONAL_SPEC.md §2
   * 홈에서는 미니앱을 종료하고, 그 외에는 상위 화면으로 간다.
   * 플레이 중에는 이탈 확인을 먼저 띄운다.
   */
  useEffect(() => onBack(runBackHandlers), []);

  useEffect(
    () =>
      pushBackHandler(() => {
        const r = routeRef.current;
        switch (r.name) {
          case 'home':
            void closeApp();
            return true;
          case 'play':
            store.setSession(
              pause(store.stateRef.current.session ?? ({} as never), new Date().toISOString()),
            );
            setConfirmLeave(true);
            return true;
          case 'chapter':
            setRoute({ name: 'scenarios' });
            return true;
          case 'sources':
            setRoute({ name: 'settings' });
            return true;
          default:
            setRoute({ name: 'home' });
            return true;
        }
      }),
    [store],
  );

  // 시트가 열려 있으면 뒤로가기는 시트만 닫는다
  useEffect(() => {
    if (!showQuotaSheet) return undefined;
    return pushBackHandler(() => {
      setShowQuotaSheet(false);
      return true;
    });
  }, [showQuotaSheet]);

  useEffect(() => {
    if (!confirmLeave) return undefined;
    return pushBackHandler(() => {
      setConfirmLeave(false);
      return true;
    });
  }, [confirmLeave]);

  // 홈에서 리워드 광고 프리로드 — §3-8
  useEffect(() => {
    if (route.name !== 'home' || state.entitlements.premium) return undefined;
    return preloadRewarded(setAdState);
  }, [route.name, state.entitlements.premium]);

  // 저장된 세션이 현재 시계열과 맞지 않으면 폐기
  useEffect(() => {
    if (!state.ready || !state.dataReady || !state.session) return;
    if (!isSessionValid(state.session, getCandles(state.session.series, state.session.timeframe))) {
      store.setSession(null);
    }
  }, [state.ready, state.dataReady, state.session, store]);

  const startSession = useCallback(
    (s: PlaySession) => {
      store.setSession(s);
      setSavedNote(false);
      setRoute({ name: 'play' });
    },
    [store],
  );

  const startDaily = useCallback(async () => {
    await ensureSeries();
    if (available(state.quota, state.entitlements.premium) <= 0) {
      setShowQuotaSheet(true);
      return;
    }
    const next = consume(state.quota, state.entitlements.premium);
    if (!next) {
      setShowQuotaSheet(true);
      return;
    }
    const candles = getCandles('usdkrw');
    const { startIdx, recentCleared } = pickSegment({
      candles,
      bars: PLAY_BARS,
      recent: state.recentSegments,
      chapters: chaptersOf('usdkrw'),
    });
    store.setQuota(next);
    store.pushRecentSegment(startIdx, recentCleared);
    startSession(
      createSession({
        id: crypto.randomUUID(),
        scenarioId: dailyScenarioId('usdkrw', startIdx),
        series: 'usdkrw',
        timeframe: 'day',
        startIdx,
        bars: PLAY_BARS,
        blind: true,
        startDate: candles[startIdx]!.d,
        now: new Date().toISOString(),
      }),
    );
  }, [state.quota, state.entitlements.premium, state.recentSegments, store, startSession]);

  const startChapter = useCallback(
    async (sc: Scenario) => {
      await ensureSeries();
      const tf = sc.timeframe ?? 'day';
      const candles = getCandles(sc.series, tf);
      const range = resolveRange(candles, sc);
      if (!range) {
        notify(t('error.dataLoad'));
        return;
      }
      // 챕터는 일일 무료 횟수를 소비하지 않는다 — §3-6
      startSession(
        createSession({
          id: crypto.randomUUID(),
          scenarioId: sc.id,
          series: sc.series,
          timeframe: tf,
          startIdx: range.startIdx,
          bars: sc.bars,
          ...(sc.tickMs === undefined ? {} : { tickMs: sc.tickMs }),
          blind: sc.blind,
          startDate: range.startDate,
          now: new Date().toISOString(),
        }),
      );
    },
    [notify, startSession],
  );

  const finishPlay = useCallback(() => {
    const s = state.session;
    if (!s) return;
    const candles = getCandles(s.series, s.timeframe);
    const now = new Date().toISOString();
    const result = buildResult(s, candles, now);
    const revealed = reveal({ ...s, status: 'finished' }, now);
    store.setSession(null);
    store.addResult(result);

    // 배지 — 결과 P는 조건에 쓰지 않는다 (§3-14)
    const fresh = newlyEarned(
      { history: [result, ...state.history], notes: state.notes, scenarios: SCENARIOS },
      state.badges.map((b) => b.id),
    );
    if (fresh.length > 0) {
      store.earnBadges(fresh);
      setTimeout(() => notify(t('toast.badge', { name: t(`badge.${fresh[0]}` as 'badge.first_reveal') })), 1200);
    }

    setSavedNote(false);
    setRoute({ name: 'result', result, session: revealed });
  }, [state.session, state.history, state.notes, state.badges, store, notify]);

  const saveNote = useCallback(
    (result: PlayResult, memo: string) => {
      store.saveNote(
        { id: crypto.randomUUID(), result, memo: memo.slice(0, 100), createdAt: new Date().toISOString() },
        true,
      );
      setSavedNote(true);
    },
    [store],
  );

  const watchAd = useCallback(() => {
    if (adState !== 'loaded') return;
    setAdState('showing');
    showRewarded({
      onReward: () => {
        store.setQuota(grantBonus(store.stateRef.current.quota));
        notify(t('toast.reward'));
      },
      onClosed: () => {
        setShowQuotaSheet(false);
        setAdState('idle');
      },
      onFailed: () => {
        setAdState('failed');
        notify(t('m01.fail'));
      },
    });
  }, [adState, store, notify]);

  /** 진행 중인 챕터의 사건을 봉 번호에 매핑한다 */
  const eventsByBar = useMemo(() => {
    const s = state.session;
    if (!s || !state.dataReady) return new Map<number, never[]>();
    const sc = getScenario(s.scenarioId);
    if (!sc || sc.events.length === 0) return new Map<number, never[]>();
    return mapEventsToBars(
      getCandles(s.series, s.timeframe),
      s.startIdx,
      s.bars,
      sc.events,
    );
  }, [state.session, state.dataReady]);

  const scenario = useMemo(
    () => (route.name === 'chapter' || route.name === 'debrief' ? getScenario(route.id) : undefined),
    [route],
  );

  if (!state.ready) return <div className="app" />;

  const tabName = isTabRoute(route.name) ? route.name : null;

  return (
    <div className="app" data-tabs={tabName !== null}>
      {route.name === 'home' && (
        <Home
          store={store}
          onStartDaily={() => void startDaily()}
          onResume={() => {
            void ensureSeries().then(() => {
              // 복원된 세션은 paused 상태다. 화면 전환과 함께 재생을 재개한다.
              const s = store.stateRef.current.session;
              if (s) store.setSession(start(s, new Date().toISOString()));
              setRoute({ name: 'play' });
            });
          }}
          onQuit={() => store.setSession(null)}
          onScenarios={() => setRoute({ name: 'scenarios' })}
          onScenario={(s) => setRoute({ name: 'chapter', id: s.id })}
          onHistory={() => setRoute({ name: 'history' })}
        />
      )}

      {route.name === 'play' && state.session && state.dataReady && (
        <Play
          session={state.session}
          onChange={store.setSession}
          onFinish={finishPlay}
          eventsByBar={eventsByBar}
          pauseOnEvent={state.settings.pauseOnEvent}
        />
      )}
      {route.name === 'play' && !state.session && <Home
        store={store} onStartDaily={() => void startDaily()} onResume={() => {}} onQuit={() => {}}
        onScenarios={() => setRoute({ name: 'scenarios' })}
        onScenario={(s) => setRoute({ name: 'chapter', id: s.id })}
        onHistory={() => setRoute({ name: 'history' })} />}

      {route.name === 'result' && (
        <Result
          session={route.session}
          result={route.result}
          saved={savedNote}
          onSave={(memo) => saveNote(route.result, memo)}
          onAgain={() => {
            const sc = getScenario(route.session.scenarioId);
            if (sc) void startChapter(sc);
            else void startDaily();
          }}
          onHome={() => setRoute({ name: 'home' })}
          onToast={notify}
          {...(getScenario(route.session.scenarioId)
            ? { onDebrief: () => setRoute({ name: 'debrief', id: route.session.scenarioId }) }
            : {})}
        />
      )}

      {route.name === 'scenarios' && (
        <Scenarios
          entitlements={state.entitlements}
          history={state.history}
          onSelect={(s) => setRoute({ name: 'chapter', id: s.id })}
        />
      )}

      {route.name === 'chapter' && scenario && (
        <Chapter
          scenario={scenario}
          owned={ownsChapter(state.entitlements, scenario)}
          onPlay={() => void startChapter(scenario)}
        />
      )}

      {route.name === 'debrief' && scenario && (
        <Debrief
          scenario={scenario}
          {...(state.history.find((h) => h.scenarioId === scenario.id)
            ? { result: state.history.find((h) => h.scenarioId === scenario.id)! }
            : {})}
          onReplay={() => void startChapter(scenario)}
        />
      )}

      {route.name === 'history' && (
        <History
          notes={state.notes}
          history={state.history}
          badges={state.badges}
          premium={state.entitlements.premium}
          onDeleteNote={store.deleteNote}
        />
      )}

      {route.name === 'settings' && (
        <Settings
          settings={state.settings}
          onChange={store.setSettings}
          onSources={() => setRoute({ name: 'sources' })}
          onClear={() => { void store.clearAll(); notify('기록을 지웠어요'); }}
        />
      )}

      {route.name === 'sources' && <Sources />}

      {tabName !== null && (
        <TabBar
          current={tabName}
          onSelect={(tab: TabName) => {
            setRoute(
              tab === 'home'
                ? { name: 'home' }
                : tab === 'scenarios'
                  ? { name: 'scenarios' }
                  : tab === 'history'
                    ? { name: 'history' }
                    : { name: 'settings' },
            );
          }}
        />
      )}

      {showQuotaSheet && (
        <div className="sheet-bg" onClick={() => setShowQuotaSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>{t('m01.title')}</h3>
            <p>{t('m01.body')}</p>
            <PrimaryButton disabled={adState !== 'loaded'} onClick={watchAd}>
              {t('m01.cta')}
            </PrimaryButton>
            {adState === 'loading' && <p className="sub" style={{ marginTop: 8 }}>{t('m01.loading')}</p>}
            {adState === 'failed' && <p className="sub" style={{ marginTop: 8 }}>{t('m01.fail')}</p>}
            <GhostButton onClick={() => setShowQuotaSheet(false)}>{t('m01.later')}</GhostButton>
          </div>
        </div>
      )}

      {confirmLeave && (
        <div className="sheet-bg" onClick={() => setConfirmLeave(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>{t('play.leaveTitle')}</h3>
            <p>{t('play.leaveBody')}</p>
            <button
              className="btn"
              onClick={() => {
                setConfirmLeave(false);
                setRoute({ name: 'home' });
              }}
            >
              {t('play.leaveConfirm')}
            </button>
            <GhostButton onClick={() => setConfirmLeave(false)}>
              {t('play.leaveCancel')}
            </GhostButton>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
      {SCENARIOS.length === 0 && <div className="empty">{t('error.dataLoad')}</div>}
    </div>
  );
}
