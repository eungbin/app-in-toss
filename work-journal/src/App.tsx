/**
 * 앱 셸 — docs/FUNCTIONAL_SPEC.md §2, §3-1
 *
 * 화면은 홈 하나이고 나머지는 시트다(구판과 같다). 라우터를 두지 않는다.
 * 뒤로가기는 kit 의 백스택이 나눠 쓴다 — 시트가 열려 있으면 닫고, 홈에서는 미니앱을 닫는다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { closeApp, onBack, runBackHandlers, useSafeArea, canSaveFile, saveFile } from '@ait/kit';
import { setClipboardText } from '@apps-in-toss/web-framework';
import type { WorkRecord, Workplace } from '@/types';
import { t } from '@/i18n';
import { MONTHS_FREE_BACK, WORKPLACE_FREE } from '@/constants';
import { LEGAL, minWageOf } from '@/data';
import { addMonths, monthKey } from '@/engine/date';
import { monthSummary } from '@/engine/month';
import { buildCsv, csvFileName, utf8ToBase64 } from '@/engine/csv';
import { isUnlocked, newId, useAppStore } from '@/store';
import { Home } from '@/screens/Home';
import { RecordSheet } from '@/screens/RecordSheet';
import { WorkplaceSheet } from '@/screens/WorkplaceSheet';
import { SettingsSheet } from '@/screens/SettingsSheet';
import { ShareCard } from '@/screens/ShareCard';
import { GateSheet } from '@/components/GateSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast } from '@/components/Toast';

const VERSION = '1.0.0';
/** 월 네비로 거슬러 갈 수 있는 한계. 무한히 뒤로 가지 않게 둔다 */
const MONTH_FLOOR_BACK = 36;
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? '';

type Sheet =
  | { kind: 'record'; rec: WorkRecord; isEdit: boolean }
  | { kind: 'workplace'; wp: Workplace; isEdit: boolean }
  | { kind: 'settings' }
  | { kind: 'card' }
  | { kind: 'gate' }
  | { kind: 'confirmRecord'; rec: WorkRecord }
  | { kind: 'confirmWorkplace'; wp: Workplace; count: number }
  | { kind: 'confirmClear1' }
  | { kind: 'confirmClear2' };

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function newWorkplace(today: string, usedColors: string[]): Workplace {
  const palette = ['purple', 'blue', 'green', 'orange', 'red'] as const;
  const color = palette.find((c) => !usedColors.includes(c)) ?? 'purple';
  return {
    id: newId(),
    name: '',
    hourlyWage: minWageOf(Number(today.slice(0, 4)), LEGAL).hourly,
    fivePlus: false,
    payday: 10,
    incomeType: 'employee',
    weeklyHolidayAuto: true,
    dependents: 1,
    children: 0,
    nonTaxableMonthly: 0,
    taxRatio: 1,
    insurance: { nps: true, nhis: true, ei: true },
    reportedMonthly: 0,
    color,
    createdAt: today,
  };
}

export function App() {
  useSafeArea();
  const store = useAppStore();
  const { state } = store;

  const today = useMemo(todayIso, []);
  const thisMonth = monthKey(today);
  const [month, setMonth] = useState(thisMonth);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const unlocked = isUnlocked(state.unlock);
  const oldestFree = addMonths(thisMonth, -MONTHS_FREE_BACK);
  const monthLocked = !unlocked && month < oldestFree;
  /**
   * 잠긴 달로도 **넘어갈 수 있게** 둔다. 경계에서 네비를 막으면 자리표시자를 볼 방법이
   * 없어 "지난 기록이 있는데 잠겼다"는 사실 자체가 사용자에게 보이지 않는다.
   */
  const monthFloor = addMonths(thisMonth, -MONTH_FLOOR_BACK);

  /** 잠금 중에는 첫 근무지만 합계에 넣는다. 기록은 지우지 않는다 */
  const activeWorkplaceIds = useMemo(
    () => (unlocked ? state.workplaces.map((w) => w.id) : state.workplaces.slice(0, WORKPLACE_FREE).map((w) => w.id)),
    [unlocked, state.workplaces],
  );
  const lockedIds = state.workplaces.filter((w) => !activeWorkplaceIds.includes(w.id)).map((w) => w.id);

  /* 뒤로가기 — 시트가 있으면 백스택이 먼저 먹고, 없으면 미니앱을 닫는다 */
  useEffect(
    () =>
      onBack(() => {
        runBackHandlers();
        if (sheet === null) void closeApp();
      }),
    [sheet],
  );

  /* 보고 있는 달과 앞뒤 달을 읽어 둔다 — 주가 달을 걸친다 */
  useEffect(() => {
    if (state.ready) void store.loadMonths(month);
  }, [state.ready, month, store]);

  /* 첫 진입에 근무지가 없으면 근무지 시트를 연다. 유일한 자동 오픈이다 */
  useEffect(() => {
    if (state.ready && state.workplaces.length === 0 && sheet === null) {
      setSheet({ kind: 'workplace', wp: newWorkplace(today, []), isEdit: false });
    }
    // eslint 규칙 없이도 의도는 분명하다: 준비된 직후 한 번만 본다
  }, [state.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.loadFailed) setToast(t('toast.loadFailed'));
  }, [state.loadFailed]);

  const records = useMemo(() => {
    const list = state.records[month] ?? [];
    return list.filter((r) => activeWorkplaceIds.includes(r.workplaceId));
  }, [state.records, month, activeWorkplaceIds]);

  const summary = useMemo(
    () =>
      monthSummary({
        records: Object.values(state.records).flat(),
        workplaces: state.workplaces,
        month,
        today,
        activeWorkplaceIds,
      }),
    [state.records, state.workplaces, month, today, activeWorkplaceIds],
  );

  const openGate = () => setSheet({ kind: 'gate' });

  const addRecord = useCallback(
    (date?: string) => {
      const wpId = state.settings.lastWorkplaceId ?? activeWorkplaceIds[0] ?? state.workplaces[0]?.id;
      if (wpId === undefined) return;
      setSheet({
        kind: 'record',
        isEdit: false,
        rec: {
          id: newId(),
          workplaceId: activeWorkplaceIds.includes(wpId) ? wpId : (activeWorkplaceIds[0] as string),
          date: date ?? (month === thisMonth ? today : `${month}-01`),
          start: 9 * 60,
          end: 18 * 60,
          breakMin: state.settings.lastBreakMin,
          extraPay: 0,
          holiday: false,
          memo: '',
        },
      });
    },
    [state.settings, state.workplaces, activeWorkplaceIds, month, thisMonth, today],
  );

  const exportCsv = useCallback(async () => {
    const all = await store.readAllRecords();
    if (all.length === 0) {
      setToast(t('csv.empty'));
      return;
    }
    const csv = buildCsv(all, state.workplaces);
    const file = csvFileName(today);
    if (canSaveFile()) {
      try {
        await saveFile(utf8ToBase64(csv), file, 'text/csv');
        setToast(t('csv.done', { file }));
        return;
      } catch {
        /* 아래 폴백으로 */
      }
    }
    // 파일 저장이 안 되는 기기·환경에서는 클립보드로 내보낸다.
    // SDK 클립보드 → 웹 클립보드 순서. 브라우저 개발 중에는 두 번째가 받는다.
    try {
      await setClipboardText(csv);
      setToast(t('csv.clipboard'));
      return;
    } catch {
      /* 아래로 */
    }
    try {
      await navigator.clipboard.writeText(csv);
      setToast(t('csv.clipboard'));
    } catch {
      setToast(t('csv.failed'));
    }
  }, [store, state.workplaces, today]);

  if (!state.ready) return <div className="screen" aria-busy="true" />;

  return (
    <div className="app">
      <Home
        month={month}
        today={today}
        summary={summary}
        records={monthLocked ? [] : records}
        workplaces={state.workplaces}
        locked={monthLocked}
        canGoBack={month > monthFloor}
        onPrev={() => setMonth((m) => addMonths(m, -1))}
        onNext={() => setMonth((m) => addMonths(m, 1))}
        onSettings={() => setSheet({ kind: 'settings' })}
        onShare={() => setSheet({ kind: 'card' })}
        onAddRecord={addRecord}
        onEditRecord={(rec) => setSheet({ kind: 'record', rec, isEdit: true })}
        onUnlock={openGate}
        onAddWorkplace={() =>
          setSheet({
            kind: 'workplace',
            wp: newWorkplace(today, state.workplaces.map((w) => w.color)),
            isEdit: false,
          })
        }
      />

      {sheet?.kind === 'record' ? (
        <RecordSheet
          initial={sheet.rec}
          isEdit={sheet.isEdit}
          workplaces={state.workplaces.filter((w) => activeWorkplaceIds.includes(w.id))}
          onSave={(rec, prevMonth) => {
            store.saveRecord(rec, prevMonth);
            setMonth(monthKey(rec.date));
            setSheet(null);
          }}
          onDelete={(rec) => setSheet({ kind: 'confirmRecord', rec })}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === 'workplace' ? (
        <WorkplaceSheet
          initial={sheet.wp}
          isEdit={sheet.isEdit}
          recordCount={Object.values(state.records).flat().filter((r) => r.workplaceId === sheet.wp.id).length}
          today={today}
          onSave={(wp) => {
            store.saveWorkplace(wp);
            setSheet(null);
          }}
          onDelete={(wp, count) => setSheet({ kind: 'confirmWorkplace', wp, count })}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === 'settings' ? (
        <SettingsSheet
          workplaces={state.workplaces}
          lockedIds={lockedIds}
          today={today}
          version={VERSION}
          supportEmail={SUPPORT_EMAIL}
          onEditWorkplace={(wp) => setSheet({ kind: 'workplace', wp, isEdit: true })}
          onAddWorkplace={() =>
            state.workplaces.length >= WORKPLACE_FREE && !unlocked
              ? openGate()
              : setSheet({
                  kind: 'workplace',
                  wp: newWorkplace(today, state.workplaces.map((w) => w.color)),
                  isEdit: false,
                })
          }
          onExportCsv={() => void exportCsv()}
          onClearAll={() => setSheet({ kind: 'confirmClear1' })}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === 'card' ? (
        <ShareCard
          month={month}
          summary={summary}
          places={activeWorkplaceIds.length}
          hideMoney={state.settings.cardHideMoney}
          onToggleHide={(v) => store.setSettings({ cardHideMoney: v })}
          onSaved={() => setToast(t('card.saved'))}
          onFailed={() => setToast(t('csv.failed'))}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === 'gate' ? (
        <GateSheet
          onClose={() => setSheet(null)}
          onReward={() => {
            store.openGate();
            setToast(t('gate.unlocked.toast'));
          }}
          onUnavailable={() => {
            setSheet(null);
            setToast(t('ad.unavailable'));
          }}
        />
      ) : null}

      {sheet?.kind === 'confirmRecord' ? (
        <ConfirmDialog
          title={t('confirm.record')}
          onConfirm={() => {
            store.removeRecord(sheet.rec);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === 'confirmWorkplace' ? (
        <ConfirmDialog
          title={t('confirm.workplace', { name: sheet.wp.name, n: sheet.count })}
          onConfirm={() => {
            store.removeWorkplace(sheet.wp.id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === 'confirmClear1' ? (
        <ConfirmDialog
          title={t('confirm.all1')}
          confirmLabel={t('confirm.delete')}
          onConfirm={() => setSheet({ kind: 'confirmClear2' })}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === 'confirmClear2' ? (
        <ConfirmDialog
          title={t('confirm.all1')}
          body={t('confirm.all2')}
          altLabel={t('confirm.export')}
          onAlt={() => {
            setSheet(null);
            void exportCsv();
          }}
          confirmLabel={t('confirm.delete')}
          onConfirm={() => {
            void store.clearAll();
            setSheet(null);
            setMonth(thisMonth);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {toast !== null ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}
