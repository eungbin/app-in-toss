/**
 * 라우팅·상태 조립 — docs/FUNCTIONAL_SPEC.md §2
 *
 * 화면은 스택으로 쌓고 뒤로가기로 하나씩 벗는다. 첫 화면에서 뒤로가기 = 미니앱 종료.
 * 자체 헤더·뒤로가기 버튼은 두지 않는다(토스가 네비게이션 바를 그린다).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  closeApp,
  onBack,
  preloadRewarded,
  pushBackHandler,
  runBackHandlers,
  useSafeArea,
  type RewardedState,
} from '@ait/kit';
import type { ConvertResult, JudgeInput, JudgeResult, Scenario, TimelineRow } from '@/types';
import { BASERATE_STALE_WARN_DAYS, SAVED_FREE } from '@/constants';
import { baserate } from '@/data';
import { ageInDays, latestRate } from '@/engine/baserate';
import { timeline } from '@/engine/timeline';
import { isUnlocked, type GateFeature } from '@/engine/gate';
import { parseDeepLink } from '@/engine/deeplink';
import { useAppStore } from '@/store';
import { Home, type Draft } from '@/screens/Home';
import { Detail } from '@/screens/Detail';
import { Timeline } from '@/screens/Timeline';
import { Card, type CardVariant } from '@/screens/Card';
import { Convert } from '@/screens/Convert';
import { Broker } from '@/screens/Broker';
import { Report } from '@/screens/Report';
import { Saved } from '@/screens/Saved';
import { Settings } from '@/screens/Settings';
import { Sources } from '@/screens/Sources';
import { GateSheet } from '@/components/GateSheet';
import { TabBar, isTabRoute, type TabName } from '@/components/TabBar';
import { RateSheet } from '@/components/RateSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast } from '@/components/Toast';
import { t } from '@/i18n';

type Route =
  | { name: 'home' }
  | { name: 'detail' }
  | { name: 'timeline' }
  | { name: 'card'; variant: CardVariant }
  | { name: 'convert' }
  | { name: 'broker'; deposit: number; rent: number }
  | { name: 'report'; deposit: number; rent: number }
  | { name: 'saved' }
  | { name: 'settings' }
  | { name: 'sources' };

const 만 = 10_000;

const emptyDraft: Draft = {
  mode: 'renew',
  current: { deposit: null, rent: null },
  proposed: { deposit: null, rent: null },
  lastChangeDate: '',
};

const toManwon = (v: number | null): number | null => (v === null ? null : Math.round(v / 만));

/** 딥링크는 앱 시작 시 한 번만 읽는다 */
function draftFromDeepLink(): Draft | null {
  const dl = parseDeepLink(location.pathname, location.search);
  if (dl === null) return null;
  return {
    mode: dl.mode,
    current: { deposit: toManwon(dl.currentDeposit), rent: toManwon(dl.currentRent) },
    proposed: { deposit: toManwon(dl.proposedDeposit), rent: toManwon(dl.proposedRent) },
    lastChangeDate: '',
  };
}

function draftFromInput(input: JudgeInput): Draft {
  return {
    mode: input.mode,
    current: { deposit: toManwon(input.current.deposit), rent: toManwon(input.current.rent) },
    proposed: { deposit: toManwon(input.proposed.deposit), rent: toManwon(input.proposed.rent) },
    lastChangeDate: input.lastChangeDate ?? '',
  };
}

export function App() {
  const store = useAppStore();
  const { state, setSettings, unlockToday, savedCap, saveScenario, deleteScenario, clearAll } = store;

  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [draft, setDraft] = useState<Draft>(() => draftFromDeepLink() ?? emptyDraft);
  const [result, setResult] = useState<JudgeResult | ConvertResult | null>(null);
  const [gate, setGate] = useState<GateFeature | null>(null);
  const [rateSheet, setRateSheet] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; onOk: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adState, setAdState] = useState<RewardedState>('idle');
  const [deepLinkApplied, setDeepLinkApplied] = useState(() => draftFromDeepLink() !== null);

  useSafeArea();

  const bundled = latestRate(baserate);
  const baseRate = state.settings.baseRateOverride ?? bundled.rate;
  const overridden = state.settings.baseRateOverride !== undefined;

  /* 저장된 마지막 입력 복원. 딥링크가 있으면 딥링크가 이긴다 */
  useEffect(() => {
    if (!state.ready || deepLinkApplied || state.lastInput === null) return;
    setDraft(draftFromInput(state.lastInput));
    setDeepLinkApplied(true);
  }, [state.ready, state.lastInput, deepLinkApplied]);

  /* 리워드 광고 프리로드 */
  useEffect(() => preloadRewarded(setAdState), []);

  /* 뒤로가기는 백스택 하나로 처리한다. 나중에 등록된 시트가 먼저 기회를 갖는다 */
  useEffect(() => onBack(runBackHandlers), []);
  useEffect(
    () =>
      pushBackHandler(() => {
        if (route.name === 'home') {
          void closeApp();
          return true;
        }
        setRoute({ name: 'home' });
        return true;
      }),
    [route.name],
  );

  /* 화면 전환 시 스크롤을 위로 */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name]);

  const judge = result !== null && result.mode === 'renew' ? result : null;
  const currentTerms = {
    deposit: (draft.current.deposit ?? 0) * 만,
    rent: (draft.current.rent ?? 0) * 만,
  };
  const proposedTerms = {
    deposit: (draft.proposed.deposit ?? 0) * 만,
    rent: (draft.proposed.rent ?? 0) * 만,
  };

  const timelineRows: TimelineRow[] = useMemo(() => {
    const deposit = proposedTerms.deposit || currentTerms.deposit;
    if (deposit === 0) return [];
    return timeline(deposit, baserate);
  }, [proposedTerms.deposit, currentTerms.deposit]);

  const unlocked = isUnlocked(state.unlock, Date.now());
  const staleDays = ageInDays(baserate);
  const stale =
    staleDays >= BASERATE_STALE_WARN_DAYS && !overridden
      ? t('data.stale', { asOf: bundled.asOf })
      : undefined;

  const openGate = useCallback((feature: GateFeature) => setGate(feature), []);

  const onSave = useCallback(() => {
    if (result === null) return;
    const input: JudgeInput = {
      mode: draft.mode,
      current: currentTerms,
      proposed: proposedTerms,
      baseRate,
      ...(draft.lastChangeDate === '' ? {} : { lastChangeDate: draft.lastChangeDate }),
    };
    const outcome = saveScenario(input, {
      verdict: result.mode === 'renew' ? result.verdict : null,
      increase: result.mode === 'renew' ? result.increase : 0,
    });
    if (outcome === 'gate') {
      openGate('saveExtra');
      return;
    }
    if (outcome === 'cap') {
      setToast(t('save.capReached'));
      return;
    }
    setToast(t('save.done', { n: state.scenarios.length + 1, cap: savedCap() }));
  }, [result, draft, currentTerms, proposedTerms, baseRate, saveScenario, openGate, savedCap, state.scenarios.length]);

  /** 탭 이동 — 스택을 쌓지 않고 갈아 끼운다 */
  const goTab = useCallback(
    (tab: TabName) => {
      // 판별 합집합이라 name 을 유니온으로 넘길 수 없다
      if (tab === 'broker') {
        setRoute({ name: 'broker', deposit: proposedTerms.deposit, rent: proposedTerms.rent });
        return;
      }
      if (tab === 'report') {
        setRoute({ name: 'report', deposit: proposedTerms.deposit, rent: proposedTerms.rent });
        return;
      }
      if (tab === 'home') setRoute({ name: 'home' });
      else if (tab === 'convert') setRoute({ name: 'convert' });
      else setRoute({ name: 'settings' });
    },
    [proposedTerms.deposit, proposedTerms.rent],
  );

  const openTool = useCallback(
    (tool: 'convert' | 'broker' | 'report' | 'saved' | 'settings') => {
      if (tool === 'broker') {
        setRoute({ name: 'broker', deposit: proposedTerms.deposit, rent: proposedTerms.rent });
        return;
      }
      if (tool === 'report') {
        setRoute({ name: 'report', deposit: proposedTerms.deposit, rent: proposedTerms.rent });
        return;
      }
      // 판별 합집합이라 name 을 유니온으로 넘길 수 없다
      if (tool === 'convert') setRoute({ name: 'convert' });
      else if (tool === 'saved') setRoute({ name: 'saved' });
      else setRoute({ name: 'settings' });
    },
    [proposedTerms.deposit, proposedTerms.rent],
  );

  if (!state.ready) return <div className="screen" aria-busy="true" />;
  if (state.loadError) {
    return (
      <div className="screen">
        <p className="lead">{t('error.dataLoad')}</p>
      </div>
    );
  }

  // 집중이 필요한 화면에서는 탭을 숨긴다 — 판정 상세·시간축·카드·저장 목록·출처
  const showTabs = isTabRoute(route.name);

  return (
    <div className="app" data-tabs={showTabs}>
      {route.name === 'home' && (
        <Home
          draft={draft}
          onDraft={setDraft}
          baseRate={baseRate}
          asOf={bundled.asOf}
          overridden={overridden}
          stale={stale}
          timelineLocked={!unlocked}
          timelineRows={timelineRows}
          onResult={setResult}
          onOpenRate={() => setRateSheet(true)}
          onOpenDetail={() => setRoute({ name: 'detail' })}
          onOpenTimeline={() => setRoute({ name: 'timeline' })}
          onUnlock={() => openGate('timeline')}
          onMakeCard={() => setRoute({ name: 'card', variant: 'judge' })}
          onSave={onSave}
          onOpenBroker={() => openTool('broker')}
          onOpenReport={() => openTool('report')}
        />
      )}

      {route.name === 'detail' && judge !== null && (
        <Detail
          result={judge}
          current={currentTerms}
          proposed={proposedTerms}
          asOf={bundled.asOf}
          overridden={overridden}
          isConversion={currentTerms.rent === 0 && proposedTerms.rent > 0}
        />
      )}

      {route.name === 'timeline' && (
        <Timeline
          rows={timelineRows}
          deposit={proposedTerms.deposit || currentTerms.deposit}
          asOf={bundled.asOf}
          onShare={() => setRoute({ name: 'card', variant: 'timeline' })}
        />
      )}

      {route.name === 'card' && (
        <Card
          variant={route.variant}
          result={judge}
          rows={timelineRows}
          current={currentTerms}
          proposed={proposedTerms}
          hideDeposit={state.settings.cardHideDeposit}
          onHideDeposit={(v) => setSettings({ cardHideDeposit: v })}
          onToast={setToast}
        />
      )}

      {route.name === 'convert' && (
        <Convert
          baseRate={baseRate}
          asOf={bundled.asOf}
          overridden={overridden}
          onJudge={(deposit, rent) => {
            setDraft((d) => ({
              ...d,
              proposed: { deposit: toManwon(deposit), rent: toManwon(rent) },
            }));
            setRoute({ name: 'home' });
          }}
        />
      )}

      {route.name === 'broker' && (
        <Broker initialDeposit={route.deposit} initialRent={route.rent} />
      )}
      {route.name === 'report' && (
        <Report initialDeposit={route.deposit} initialRent={route.rent} />
      )}

      {route.name === 'saved' && (
        <Saved
          scenarios={state.scenarios}
          cap={savedCap()}
          locked={!unlocked && state.scenarios.length >= SAVED_FREE}
          onOpen={(s: Scenario) => {
            setDraft(draftFromInput(s.input));
            setRoute({ name: 'home' });
          }}
          onDelete={(id) =>
            setConfirm({
              message: t('save.deleteConfirm'),
              onOk: () => {
                deleteScenario(id);
                setConfirm(null);
              },
            })
          }
          onUnlock={() => openGate('saveExtra')}
        />
      )}

      {route.name === 'settings' && (
        <Settings
          savedCount={state.scenarios.length}
          onOpenSaved={() => setRoute({ name: 'saved' })}
          baseRate={baseRate}
          bundledRate={bundled.rate}
          asOf={bundled.asOf}
          overridden={overridden}
          onOpenRate={() => setRateSheet(true)}
          onOpenSources={() => setRoute({ name: 'sources' })}
          onClearAll={() =>
            setConfirm({
              message: t('settings.clearConfirm'),
              onOk: () => {
                void clearAll();
                setConfirm(null);
                setDraft(emptyDraft);
                setToast('저장한 계산을 모두 지웠어요');
              },
            })
          }
        />
      )}

      {route.name === 'sources' && <Sources />}

      {gate !== null && (
        <GateSheet
          adState={adState}
          onReward={() => {
            unlockToday();
            setGate(null);
            setToast(t('gate.unlocked.toast'));
            if (gate === 'timeline') setRoute({ name: 'timeline' });
          }}
          onClose={() => setGate(null)}
          onFail={() => {
            setGate(null);
            setToast(t('ad.unavailable'));
          }}
        />
      )}

      {rateSheet && (
        <RateSheet
          baseRate={baseRate}
          bundledRate={bundled.rate}
          asOf={bundled.asOf}
          onApply={(rate) => {
            setSettings(rate === undefined ? { baseRateOverride: undefined } : { baseRateOverride: rate });
            setRateSheet(false);
          }}
          onClose={() => setRateSheet(false)}
        />
      )}

      {confirm !== null && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onOk}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast !== null && <Toast message={toast} onDone={() => setToast(null)} />}

      {showTabs && <TabBar current={route.name as TabName} onSelect={goTab} />}
    </div>
  );
}

