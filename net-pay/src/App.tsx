/**
 * 라우팅·상태 조립 — docs/FUNCTIONAL_SPEC.md §2, §3-1
 * 화면은 스택으로 쌓고, 뒤로가기로 하나씩 벗는다. 첫 화면에서 뒤로가기 = 미니앱 종료.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { closeApp, configureAds, onBack, preloadRewarded, pushBackHandler, runBackHandlers, useSafeArea, type RewardedState } from '@ait/kit';
import type { CalcInput, CalcOptions, Scenario } from '@/types';
import { DEPENDENTS_MAX, NONTAX_MEAL_DEFAULT, SAVED_CAP } from '@/constants';
import { RATES } from '@/data';
import { computeNet } from '@/engine/net';
import { computeGross } from '@/engine/reverse';
import { isUnlocked, type GateFeature } from '@/engine/gate';
import { hasBonus } from '@/engine/bonus';
import { parseDeepLink } from '@/engine/deeplink';
import { todayIso } from '@/engine/format';
import { useAppStore } from '@/store';
import { Input, type Draft } from '@/screens/Input';
import { Result } from '@/screens/Result';
import { Detail } from '@/screens/Detail';
import { Timeline } from '@/screens/Timeline';
import { Card } from '@/screens/Card';
import { Severance } from '@/screens/Severance';
import { Leave } from '@/screens/Leave';
import { Saved } from '@/screens/Saved';
import { Compare } from '@/screens/Compare';
import { Settings } from '@/screens/Settings';
import { Sources } from '@/screens/Sources';
import { OptionsSheet } from '@/components/OptionsSheet';
import { GateSheet } from '@/components/GateSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast } from '@/components/Toast';
import { TabBar, isTabRoute, type TabName } from '@/components/TabBar';
import { t } from '@/i18n';

type Route =
  | { name: 'calc' }
  | { name: 'result' }
  | { name: 'detail' }
  | { name: 'timeline' }
  | { name: 'card'; variant: 'net' | 'timeline' }
  | { name: 'severance' }
  | { name: 'leave' }
  | { name: 'saved' }
  | { name: 'compare'; a: Scenario; b: Scenario }
  | { name: 'settings' }
  | { name: 'sources' };

/** 탭바를 숨기는 화면 — 집중이 필요한 곳 (SCREEN_FLOW 1장) */
const FULL_SCREEN = ['detail', 'timeline', 'card', 'compare', 'sources'];

const initialDraft: Draft = {
  mode: 'reverse',
  amountManwon: null,
  dependents: 1,
  children: 0,
  meal: true,
  bonusCount: 0,
  bonusAnnual: null,
};

/** 딥링크는 앱 시작 시 한 번만 읽는다 */
function draftFromDeepLink(): Draft | null {
  const dl = parseDeepLink(location.pathname, location.search);
  if (!dl || dl.amount === null) return null;
  return {
    mode: dl.mode,
    amountManwon: Math.round(dl.amount / 10_000),
    dependents: dl.dependents ?? 1,
    children: dl.children ?? 0,
    meal: (dl.nonTaxableMonthly ?? NONTAX_MEAL_DEFAULT) > 0,
    bonusCount: 0,
    bonusAnnual: null,
  };
}

export function App() {
  // 세이프 에어리어를 CSS 변수로 내보낸다. CSS env() 는 쓰지 않는다(호스트 값과 이중 적용됨)
  useSafeArea();

  const store = useAppStore();
  const { state } = store;
  // 아래 효과의 의존성에 store 객체를 넣지 않는다. 콜백만 꺼내 쓴다
  const { setLastInput } = store;

  const [stack, setStack] = useState<Route[]>(() =>
    draftFromDeepLink() ? [{ name: 'calc' }, { name: 'result' }] : [{ name: 'calc' }],
  );
  const route = stack[stack.length - 1] as Route;
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const [draft, setDraft] = useState<Draft>(() => draftFromDeepLink() ?? initialDraft);
  const [committed, setCommitted] = useState<number | null>(draft.amountManwon);
  const [showOptions, setShowOptions] = useState(false);
  const [gate, setGate] = useState<GateFeature | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; onOk: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adState, setAdState] = useState<RewardedState>('idle');
  const restored = useRef(false);

  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  /* 광고 — 홈 진입 시 프리로드 */
  useEffect(() => {
    configureAds({});
    return preloadRewarded(setAdState);
  }, []);

  /* 뒤로가기 — 시트가 먼저 먹고(각자 pushBackHandler), 남으면 화면 스택을 벗는다 */
  useEffect(() => onBack(runBackHandlers), []);
  useEffect(
    () =>
      pushBackHandler(() => {
        if (stackRef.current.length > 1) {
          pop();
          return true;
        }
        // 다른 탭에서 뒤로가기는 계산 탭으로. 계산 탭에서만 앱을 닫는다
        if (stackRef.current[0]?.name !== 'calc') {
          setStack([{ name: 'calc' }]);
          return true;
        }
        void closeApp();
        return true;
      }),
    [pop],
  );

  /* 저장된 마지막 입력 복원 (딥링크가 있으면 딥링크가 이긴다) */
  useEffect(() => {
    if (!state.ready || restored.current) return;
    restored.current = true;
    if (draftFromDeepLink()) return;
    const last = state.lastInput;
    if (!last) return;
    const amount = last.mode === 'reverse' ? last.targetNet : last.annualGross;
    const next: Draft = {
      mode: last.mode,
      amountManwon: amount ? Math.round(amount / 10_000) : null,
      dependents: last.dependents,
      children: last.children,
      meal: last.nonTaxableMonthly > 0,
      bonusCount: last.bonusCount ?? 0,
      bonusAnnual: last.bonusAnnual ?? null,
    };
    setDraft(next);
    setCommitted(next.amountManwon);
  }, [state.ready, state.lastInput]);

  /* 자녀는 공제대상 가족에 포함된다 */
  const effectiveDependents = Math.min(Math.max(draft.dependents, draft.children + 1), DEPENDENTS_MAX);
  const adjustedTo = draft.children + 1 > draft.dependents ? effectiveDependents : null;

  const opts: CalcOptions = useMemo(
    () => ({
      dependents: effectiveDependents,
      children: draft.children,
      nonTaxableMonthly: draft.meal ? NONTAX_MEAL_DEFAULT : 0,
      taxRatio: 1,
      asOf: todayIso(),
    }),
    [effectiveDependents, draft.children, draft.meal],
  );

  const result = useMemo(() => {
    if (committed === null || committed <= 0) return null;
    const amount = committed * 10_000;
    if (draft.mode === 'reverse') {
      const r = computeGross(amount, opts);
      return { breakdown: r.breakdown, reverse: r, targetNet: amount };
    }
    return { breakdown: computeNet(amount, opts), reverse: null, targetNet: null };
  }, [committed, draft.mode, opts]);

  /* 마지막 입력 저장 */
  const asCalcInput = useCallback(
    (): CalcInput => ({
      ...opts,
      mode: draft.mode,
      ...(draft.bonusCount > 0 ? { bonusCount: draft.bonusCount } : {}),
      ...(draft.bonusAnnual ? { bonusAnnual: draft.bonusAnnual } : {}),
      ...(draft.mode === 'reverse'
        ? { targetNet: (committed ?? 0) * 10_000 }
        : { annualGross: (committed ?? 0) * 10_000 }),
    }),
    [opts, draft.mode, draft.bonusCount, draft.bonusAnnual, committed],
  );
  useEffect(() => {
    if (!state.ready || committed === null) return;
    setLastInput(asCalcInput());
  }, [state.ready, committed, asCalcInput, setLastInput]);

  /* 요율 데이터가 올해를 못 따라가는 경우 안내 */
  const staleYear = useMemo(() => {
    const year = new Date().getFullYear();
    return RATES.some((r) => Number(r.from.slice(0, 4)) >= year) ? null : String(year);
  }, []);

  const bonusPlan = useMemo(
    () => ({ count: draft.bonusCount, annualTotal: draft.bonusAnnual ?? 0 }),
    [draft.bonusCount, draft.bonusAnnual],
  );

  const unlocked = isUnlocked(state.unlock, Date.now());

  /** 게이트가 걸린 기능으로 이동. 잠겼으면 시트를 띄운다 */
  const gated = useCallback(
    (feature: GateFeature, go: () => void) => {
      if (unlocked) go();
      else setGate(feature);
    },
    [unlocked],
  );

  const openTimeline = useCallback(() => gated('timeline', () => push({ name: 'timeline' })), [gated, push]);

  const doSave = useCallback(() => {
    if (!result) return;
    const name = `계산 ${state.scenarios.length + 1}`;
    const r = store.saveScenario(name, asCalcInput());
    if (r === 'saved') setToast(t('save.done', { n: state.scenarios.length + 1, cap: unlocked ? SAVED_CAP : 3 }));
    else if (r === 'cap') setToast(t('save.capReached', { cap: SAVED_CAP }));
    else setGate('saveExtra');
  }, [result, state.scenarios.length, store, asCalcInput, unlocked]);

  const onReward = useCallback(() => {
    const feature = gate;
    store.unlockToday();
    setGate(null);
    setToast(t('gate.unlocked'));
    if (feature === 'timeline') push({ name: 'timeline' });
    if (feature === 'saveExtra') setTimeout(doSave, 0);
  }, [gate, store, push, doSave]);

  const openScenario = useCallback((s: Scenario) => {
    const amount = s.input.mode === 'reverse' ? s.input.targetNet : s.input.annualGross;
    setDraft({
      mode: s.input.mode,
      amountManwon: amount ? Math.round(amount / 10_000) : null,
      dependents: s.input.dependents,
      children: s.input.children,
      meal: s.input.nonTaxableMonthly > 0,
      bonusCount: s.input.bonusCount ?? 0,
      bonusAnnual: s.input.bonusAnnual ?? null,
    });
    setCommitted(amount ? Math.round(amount / 10_000) : null);
    setStack([{ name: 'calc' }, { name: 'result' }]);
  }, []);

  const goTab = useCallback((tab: TabName) => setStack([{ name: tab }]), []);

  /** 결과 화면에 넘길 조건이 갖춰졌는지 */
  const calc = useCallback(() => {
    setCommitted(draft.amountManwon);
    push({ name: 'result' });
  }, [draft.amountManwon, push]);

  if (!state.ready) return <main className="screen" aria-busy="true" />;

  const tab: TabName | null = isTabRoute(stack[0]?.name ?? '') ? (stack[0]!.name as TabName) : null;
  const showTabs = tab !== null && !FULL_SCREEN.includes(route.name);

  return (
    <div className="app" data-tabs={showTabs}>
      {state.loadError && <p className="dev-banner">{t('error.storage')}</p>}

      {route.name === 'calc' && (
        <Input
          draft={draft}
          opts={opts}
          hasBonus={hasBonus(bonusPlan)}
          staleYear={staleYear}
          onAmount={(v) => setDraft((d) => ({ ...d, amountManwon: v }))}
          onToggleMode={() => {
            setDraft((d) => ({ ...d, mode: d.mode === 'reverse' ? 'forward' : 'reverse', amountManwon: null }));
            setCommitted(null);
          }}
          onOptions={() => setShowOptions(true)}
          onCalc={calc}
        />
      )}

      {route.name === 'result' && result && (
        <Result
          breakdown={result.breakdown}
          opts={opts}
          reverse={result.reverse}
          mode={draft.mode}
          timelineLocked={!unlocked}
          hasBonus={hasBonus(bonusPlan)}
          onDetail={() => push({ name: 'detail' })}
          onTimeline={openTimeline}
          onCard={() => push({ name: 'card', variant: 'net' })}
          onSave={doSave}
        />
      )}

      {route.name === 'detail' && result && (
        <Detail breakdown={result.breakdown} opts={opts} reverse={result.reverse} bonus={bonusPlan} />
      )}

      {route.name === 'timeline' && result && (
        <Timeline
          annualGross={result.breakdown.annualGross}
          opts={opts}
          onShare={() => push({ name: 'card', variant: 'timeline' })}
        />
      )}

      {route.name === 'card' && result && (
        <Card
          variant={route.variant}
          breakdown={result.breakdown}
          opts={opts}
          mode={draft.mode}
          targetNet={result.targetNet}
          hideGross={state.settings.cardHideGross}
          onHideGrossChange={(v) => store.setSettings({ cardHideGross: v })}
          onToast={setToast}
        />
      )}

      {route.name === 'severance' && <Severance grossMonthly={result?.breakdown.grossMonthly ?? 0} />}
      {route.name === 'leave' && <Leave grossMonthly={result?.breakdown.grossMonthly ?? 0} />}

      {route.name === 'saved' && (
        <Saved
          scenarios={state.scenarios}
          unlocked={unlocked}
          onOpen={openScenario}
          onDelete={(s) =>
            setConfirm({
              message: t('confirm.deleteOne', { name: s.name }),
              onOk: () => {
                store.deleteScenario(s.id);
                setConfirm(null);
              },
            })
          }
          onCompare={(a, b) => gated('compare', () => push({ name: 'compare', a, b }))}
        />
      )}

      {route.name === 'compare' && <Compare a={route.a} b={route.b} />}

      {route.name === 'settings' && (
        <Settings
          onSources={() => push({ name: 'sources' })}
          onClearAll={() =>
            setConfirm({
              message: t('confirm.clearAll1'),
              onOk: () =>
                setConfirm({
                  message: t('confirm.clearAll2'),
                  onOk: () => {
                    void store.clearAll();
                    setConfirm(null);
                    setStack([{ name: 'calc' }]);
                    setToast('모두 삭제했어요');
                  },
                }),
            })
          }
        />
      )}

      {route.name === 'sources' && <Sources />}

      {showOptions && (
        <OptionsSheet
          dependents={draft.dependents}
          children={draft.children}
          meal={draft.meal}
          bonusCount={draft.bonusCount}
          bonusAnnual={draft.bonusAnnual}
          adjustedTo={adjustedTo}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onClose={() => setShowOptions(false)}
        />
      )}

      {gate && (
        <GateSheet
          adState={adState}
          onReward={onReward}
          onClose={() => setGate(null)}
          onFail={() => setToast(t('ad.unavailable'))}
        />
      )}

      {confirm && (
        <ConfirmDialog message={confirm.message} onConfirm={confirm.onOk} onCancel={() => setConfirm(null)} />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {showTabs && tab && <TabBar current={tab} onSelect={goTab} />}
    </div>
  );
}
