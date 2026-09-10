/**
 * 라우팅·상태 조립 — docs/FUNCTIONAL_SPEC.md §2, §3-7
 *
 * 화면을 스택으로 쌓고 뒤로가기로 하나씩 벗는다. 첫 화면에서 뒤로가기 = 미니앱 종료.
 * 자체 헤더·뒤로가기 버튼은 두지 않는다(토스가 네비게이션 바를 그린다).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  adsSupported,
  canSaveImage,
  closeApp,
  getAdGroups,
  initBannerSdk,
  onBack,
  preloadRewarded,
  pushBackHandler,
  runBackHandlers,
  saveCardImage,
  useSafeArea,
} from '@ait/kit';
import { findPreset } from '@/data/presets';
import { convert } from '@/engine/canvas';
import { checkGate } from '@/engine/gate';
import { judge } from '@/engine/judge';
import { DEV_PICK_MARKER, PhotoError, devLoadDataUri, devPickFile, pickFromAlbum, shootWithCamera } from '@/engine/photo';
import { useAppStore } from '@/store';
import type { CropBox, OutputImage, Preset, SourceImage } from '@/types';
import { Home } from '@/screens/Home';
import { Check } from '@/screens/Check';
import { Crop } from '@/screens/Crop';
import { Result } from '@/screens/Result';
import { Sources } from '@/screens/Sources';
import { CustomSheet } from '@/components/CustomSheet';
import { GateSheet } from '@/components/GateSheet';
import { PermDialog } from '@/components/PermDialog';
import { Toast } from '@/components/Toast';
import { t } from '@/i18n';

type Route = 'home' | 'check' | 'crop' | 'result' | 'sources';
type Modal = { kind: 'custom' } | { kind: 'gate' } | { kind: 'perm'; which: 'photos' | 'camera' } | null;

export function App() {
  useSafeArea();
  const { state, selectPreset, setCustom, countSave, openGate } = useAppStore();

  const [stack, setStack] = useState<Route[]>(['home']);
  const [modal, setModal] = useState<Modal>(null);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [output, setOutput] = useState<OutputImage | null>(null);
  const [crop, setCrop] = useState<CropBox | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [diag, setDiag] = useState('');

  const route = stack[stack.length - 1] ?? 'home';
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  /* ── 프리셋과 목표 ─────────────────────────────────── */
  const preset: Preset = useMemo(() => {
    const base = findPreset(state.presetId);
    if (base.id !== 'custom') return base;
    // 직접 입력은 사용자 값으로 프리셋을 만들어 쓴다
    const maxBytes = state.custom.maxKb === null ? undefined : state.custom.maxKb * 1000;
    return {
      ...base,
      target: { w: state.custom.w, h: state.custom.h },
      ...(maxBytes === undefined ? {} : { maxBytes }),
      format: maxBytes === undefined ? 'any' : 'jpeg',
    };
  }, [state.presetId, state.custom]);

  const verdict = useMemo(() => (source ? judge(source, preset) : null), [source, preset]);

  /* ── 부트스트랩 ────────────────────────────────────── */
  useEffect(() => {
    initBannerSdk(() => {});
  }, []);

  /**
   * 개발 전용 검증 진입점. 브라우저에는 SDK 가 없어 사진을 넣을 수 없고, 파일 대화상자는
   * 자동화가 안 된다. dataUri 를 바로 밀어 넣어 판정·자르기·결과를 확인한다.
   * `import.meta.env.DEV` 정적 치환으로 프로덕션에서는 통째로 사라진다(check:bundle 이 확인).
   */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as Record<string, unknown>;
    w[DEV_PICK_MARKER] = async (dataUri: string) => {
      const img = await devLoadDataUri(dataUri);
      setSource(img);
      setOutput(null);
      setCrop(null);
      setStack(['home', 'check']);
      return { width: img.width, height: img.height, bytes: img.bytes, mime: img.mime };
    };
    return () => {
      delete w[DEV_PICK_MARKER];
    };
  }, []);

  /* 뒤로가기 — 스택이 남아 있으면 한 겹, 첫 화면이면 종료 */
  useEffect(() => {
    const off = pushBackHandler(() => {
      if (stackRef.current.length > 1) {
        pop();
        return true;
      }
      return false;
    });
    const offBack = onBack(() => {
      runBackHandlers();
      if (stackRef.current.length === 1) closeApp();
    });
    return () => {
      off();
      offBack?.();
    };
  }, [pop]);

  /* ── 사진 입력 ─────────────────────────────────────── */
  const take = useCallback(
    async (kind: 'photos' | 'camera' | 'dev') => {
      setBusy(true);
      try {
        const img =
          kind === 'dev'
            ? await devPickFile()
            : kind === 'photos'
              ? await pickFromAlbum()
              : await shootWithCamera();
        setSource(img);
        setOutput(null);
        setCrop(null);
        setStack(['home', 'check']);
      } catch (e) {
        if (e instanceof PhotoError) {
          if (e.kind === 'permission' && kind !== 'dev') setModal({ kind: 'perm', which: kind });
          else if (e.kind === 'decode' || e.kind === 'unsupported') {
            // 진단 빌드에서는 무엇이 실패했는지 화면에 드러낸다. 출시 빌드에서는 문구 하나뿐이라
            // 실기기에서 원인을 좁힐 수가 없었다(2026-09-09 QR 테스트).
            setDiag(import.meta.env.VITE_DIAG ? `[${e.kind}] ${e.detail ?? '상세 없음'}` : '');
            setToast(t('error.decode'));
          }
          // cancelled 는 아무 것도 하지 않고 홈에 머문다
        } else {
          setDiag(import.meta.env.VITE_DIAG ? `[unknown] ${String(e)}`.slice(0, 200) : '');
          setToast(t('error.decode'));
        }
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /* ── 변환 ──────────────────────────────────────────── */
  const runConvert = useCallback(
    async (box: CropBox) => {
      if (!source) return;
      setBusy(true);
      try {
        const out = await convert(source.dataUri, box, preset, preset.target);
        setOutput(out);
        setCrop(box);
        // 변환이 끝나면 언제나 결과가 맨 위다.
        // 예전에는 스택에 result 가 이미 있으면 손대지 않았는데, 결과에서 [다시 자르기] 로
        // 들어온 재변환에서는 crop 이 맨 위에 남아 자르기 화면에 갇혔다(실기기 확인 2026-09-09).
        setStack((s) => [...s.filter((x) => x !== 'crop' && x !== 'result'), 'result']);
      } catch {
        setToast(t('error.decode'));
      } finally {
        setBusy(false);
      }
    },
    [source, preset],
  );

  /** 판정에서 [규격에 맞추기] — 비율이 맞으면 자르기를 건너뛴다(§4-2) */
  const onFix = useCallback(() => {
    if (!source || !verdict) return;
    if (verdict.ratio === 'ok') {
      void runConvert({ x: 0, y: 0, w: source.width, h: source.height });
      return;
    }
    push('crop');
  }, [source, verdict, runConvert, push]);

  /* ── 저장 ──────────────────────────────────────────── */
  const adsAvailable = adsSupported() && getAdGroups().rewarded.trim() !== '';
  const gate = checkGate(
    { savedToday: state.usage.savedToday, gateOpenUntil: state.usage.gateOpenUntil, adsAvailable },
    new Date(),
  );
  const gateOpen =
    !adsAvailable ||
    (state.usage.gateOpenUntil !== null && Date.now() < state.usage.gateOpenUntil);

  const onSave = useCallback(async () => {
    if (!output) return;
    if (gate === 'gate') {
      setModal({ kind: 'gate' });
      return;
    }
    setSaving(true);
    try {
      const base64 = output.dataUri.slice(output.dataUri.indexOf(',') + 1);
      const ext = output.mime === 'image/png' ? 'png' : 'jpg';
      await saveCardImage(base64, `photo-standard_${preset.id}_${output.width}x${output.height}.${ext}`);
      countSave();
      setToast(t('result.savedToast'));
    } catch {
      setToast(t('result.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [output, gate, preset, countSave]);

  /* 상한에 닿았을 때만 리워드를 프리로드한다(§3-1 5번) */
  useEffect(() => {
    if (route !== 'result' || gate !== 'gate') return;
    return preloadRewarded(() => {});
  }, [route, gate]);

  if (!state.ready) return <div className="screen" />;

  return (
    <>
      {route === 'home' && (
        <Home
          preset={preset}
          presetId={state.presetId}
          custom={state.custom}
          source={source}
          busy={busy}
          onPick={() => void take('photos')}
          onShoot={() => void take('camera')}
          onSelectPreset={selectPreset}
          onOpenCustom={() => setModal({ kind: 'custom' })}
          onOpenSources={() => push('sources')}
          onDevPick={() => void take('dev')}
        />
      )}

      {route === 'check' && source && verdict && (
        <Check
          source={source}
          preset={preset}
          verdict={verdict}
          target={preset.target}
          maxBytes={preset.maxBytes}
          busy={busy}
          onFix={onFix}
          onPickAnother={() => void take('photos')}
          onOpenSources={() => push('sources')}
        />
      )}

      {route === 'crop' && source && (
        <Crop
          source={source}
          target={preset.target}
          ratioLabel={ratioLabel(preset)}
          initial={crop ?? undefined}
          busy={busy}
          onApply={(box) => void runConvert(box)}
        />
      )}

      {route === 'result' && output && (
        <Result
          output={output}
          preset={preset}
          maxBytes={preset.maxBytes}
          savedToday={state.usage.savedToday}
          gateOpen={gateOpen}
          canSave={canSaveImage()}
          saving={saving}
          onSave={() => void onSave()}
          onRecrop={() => source && push('crop')}
          onPickAnother={() => void take('photos')}
          onOpenSources={() => push('sources')}
        />
      )}

      {route === 'sources' && <Sources />}

      {modal?.kind === 'custom' && (
        <CustomSheet
          value={state.custom}
          onClose={() => setModal(null)}
          onApply={(v) => {
            setCustom(v);
            selectPreset('custom');
            setModal(null);
          }}
        />
      )}

      {modal?.kind === 'gate' && (
        <GateSheet
          onClose={() => setModal(null)}
          onEarned={(until) => {
            openGate(until);
            setModal(null);
            void onSave();
          }}
        />
      )}

      {modal?.kind === 'perm' && (
        <PermDialog kind={modal.which} onClose={() => setModal(null)} />
      )}

      {toast !== '' && <Toast message={toast} onDone={() => setToast('')} />}

      {import.meta.env.VITE_DIAG && diag !== '' && (
        <div
          onClick={() => setDiag('')}
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            top: 'calc(12px + var(--safe-top))',
            padding: 14,
            borderRadius: 12,
            background: '#191f28',
            color: '#fff',
            fontSize: 12,
            lineHeight: 1.6,
            wordBreak: 'break-all',
            zIndex: 30,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>진단 (눌러서 닫기)</div>
          {diag}
        </div>
      )}
    </>
  );
}

/** 물리 규격이 있으면 cm 로, 없으면 픽셀 비율을 약분해 보여 준다 */
function ratioLabel(p: Preset): string {
  if (p.physical) return `${p.physical.wMm / 10} : ${p.physical.hMm / 10}`;
  const g = gcd(p.target.w, p.target.h);
  return `${p.target.w / g} : ${p.target.h / g}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
