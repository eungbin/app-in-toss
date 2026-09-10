/**
 * 앱 셸 — docs/SCREEN_FLOW.md 1장
 *
 * 화면 4개(홈·결과·곡선·설정)와 시트 3개. 자체 헤더·뒤로가기 버튼은 없다 — 토스가 그린다.
 * 뒤로가기는 kit 백스택이 나눠 쓴다: 시트가 열려 있으면 시트를 닫고, 화면이 쌓여 있으면
 * 직전 화면으로, 홈에서는 미니앱을 닫는다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adsSupported, closeApp, onBack, preloadRewarded, runBackHandlers, useSafeArea, type RewardedState } from '@ait/kit';
import type { Breakdown, Draft, Input, StdHoursBasis } from '@/types';
import { calculate, defaultPaidHolidayHours, insuredBand, tenureYearsMonths } from '@/engine';
import { MIN_WAGE } from '@/data';
import { isUnlocked, useAppStore } from '@/store';
import { t } from '@/i18n';
import { Home } from '@/screens/Home';
import { Result } from '@/screens/Result';
import { Curve } from '@/screens/Curve';
import { Settings } from '@/screens/Settings';
import { QuitReasonSheet } from '@/screens/QuitReasonSheet';
import { ShareCard } from '@/screens/ShareCard';
import { GateSheet } from '@/components/GateSheet';
import { Toast } from '@/components/Toast';

type Route = 'home' | 'result' | 'curve' | 'settings';
type SheetKind = 'reasons' | 'card' | 'gate' | null;

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const emptyDraft = (): Draft => ({
  reason: 'involuntary',
  hiredDate: '',
  quitDate: '',
  ageAtQuit: null,
  disabled: false,
  weekHours: null,
  holidayHours: null,
  monthlyWage: null,
});

/** 초안이 다 찼으면 엔진 입력으로 바꾼다. 한 칸이라도 비면 null */
function toInput(d: Draft): Input | null {
  if (d.hiredDate === '' || d.quitDate === '') return null;
  if (d.ageAtQuit === null || d.weekHours === null || d.monthlyWage === null) return null;
  const stdHours: StdHoursBasis = {
    kind: 'week',
    hours: d.weekHours,
    // 주휴시간을 모르는 사용자가 많다. 비우면 주 소정근로시간에서 채운다(§3-1)
    paidHolidayHours: d.holidayHours ?? defaultPaidHolidayHours(d.weekHours),
  };
  return {
    reason: d.reason,
    ...(d.justifiedItem === undefined ? {} : { justifiedItem: d.justifiedItem }),
    ageAtQuit: d.ageAtQuit,
    disabled: d.disabled,
    hiredDate: d.hiredDate,
    quitDate: d.quitDate,
    stdHours,
    wageTotal3m: d.monthlyWage * 3,
  };
}

const BAND_LABEL: Record<ReturnType<typeof insuredBand>, string> = {
  lt1: '1년 미만',
  y1to3: '1년 이상 3년 미만',
  y3to5: '3년 이상 5년 미만',
  y5to10: '5년 이상 10년 미만',
  gte10: '10년 이상',
};

export function App() {
  useSafeArea();
  const { state, openGate, setSettings, clearAll } = useAppStore();

  const today = useMemo(todayIso, []);
  const [route, setRoute] = useState<Route>('home');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [result, setResult] = useState<Breakdown | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adState, setAdState] = useState<RewardedState>('idle');

  const unlocked = isUnlocked(state.unlockedUntil);

  /* 리워드는 홈 진입 시 프리로드한다(MZ-2) */
  useEffect(() => {
    if (!adsSupported()) {
      setAdState('failed');
      return undefined;
    }
    return preloadRewarded(setAdState);
  }, []);

  /* 뒤로가기 — 시트 → 화면 → 종료 */
  useEffect(
    () =>
      onBack(() => {
        if (sheet !== null) {
          runBackHandlers();
          return;
        }
        runBackHandlers();
        if (route === 'home') {
          void closeApp();
          return;
        }
        setRoute(route === 'curve' ? 'result' : 'home');
      }),
    [route, sheet],
  );

  const tenureLabel = useMemo(() => {
    if (draft.hiredDate === '' || draft.quitDate === '') return null;
    try {
      const { years, months } = tenureYearsMonths(draft.hiredDate, draft.quitDate);
      const band = BAND_LABEL[insuredBand(draft.hiredDate, draft.quitDate)];
      return `${t('s01.period.derived', { years, months })} (${band})`;
    } catch {
      return null;
    }
  }, [draft.hiredDate, draft.quitDate]);

  const minWageYear = useMemo(() => {
    const years = MIN_WAGE.minWage.map((w) => w.year);
    const y = Number((result?.periodDays === undefined ? today : draft.quitDate || today).slice(0, 4));
    return years.includes(y) ? y : (years[years.length - 1] as number);
  }, [today, draft.quitDate, result]);

  const submit = useCallback(() => {
    const input = toInput(draft);
    if (input === null) return;
    try {
      setResult(calculate(input, today));
      setRoute('result');
      window.scrollTo(0, 0);
    } catch {
      setToast('입력한 날짜를 다시 확인해 주세요');
    }
  }, [draft, today]);

  const goCurve = useCallback(() => {
    setRoute('curve');
    window.scrollTo(0, 0);
    if (!unlocked) setSheet('gate');
  }, [unlocked]);

  if (!state.ready) return <div className="screen" aria-busy="true" />;

  return (
    <div className="app">
      {route === 'home' ? (
        <Home
          draft={draft}
          tenureLabel={tenureLabel}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onOpenReasons={() => setSheet('reasons')}
          onSubmit={submit}
          onSettings={() => {
            setRoute('settings');
            window.scrollTo(0, 0);
          }}
          onEmpty={setToast}
        />
      ) : null}

      {route === 'result' && result !== null ? (
        <Result
          result={result}
          wageTotal3m={(draft.monthlyWage ?? 0) * 3}
          minWageYear={minWageYear}
          unlocked={unlocked}
          onCurve={goCurve}
          onShare={() => setSheet('card')}
          onAgain={() => {
            setRoute('home');
            window.scrollTo(0, 0);
          }}
        />
      ) : null}

      {route === 'curve' && result !== null ? (
        <Curve result={result} unlocked={unlocked} onUnlock={() => setSheet('gate')} />
      ) : null}

      {route === 'settings' ? <Settings minWageYear={minWageYear} onClearAll={() => void clearAll()} /> : null}

      {sheet === 'reasons' ? (
        <QuitReasonSheet
          {...(draft.justifiedItem === undefined ? {} : { picked: draft.justifiedItem })}
          onPick={(id) => {
            setDraft((d) => ({ ...d, reason: 'voluntaryJustified', justifiedItem: id }));
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === 'card' && result !== null ? (
        <ShareCard
          result={result}
          minWageYear={minWageYear}
          hideMoney={state.settings.cardHideMoney}
          onToggleHide={(v) => setSettings({ cardHideMoney: v })}
          onToast={setToast}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === 'gate' ? (
        <GateSheet
          adState={adState}
          onReward={() => {
            openGate();
            setSheet(null);
            setToast('오늘 하루 열었어요');
          }}
          onFail={() => {
            setSheet(null);
            setToast(t('ad.failed'));
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {toast !== null ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}
