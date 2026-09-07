/** 협상 카드 — docs/SCREEN_FLOW.md S05. 게이트 없이 무료(신규 유입 수단) */
import { useEffect, useRef, useState } from 'react';
import { canSaveImage, saveCardImage, shareLink } from '@ait/kit';
import type { Breakdown, CalcMode, CalcOptions } from '@/types';
import { CARD_H, CARD_W, drawCard, drawTimelineCard, toBase64Png } from '@/engine/card';
import { cardShareText, type CardArgs } from '@/engine/cardText';
import { APP_NAME, buildDeepLinkPath } from '@/engine/deeplink';
import { computeTimeline } from '@/engine/timeline';
import { timelineHeadline } from './Timeline';
import { BasisFooter } from '@/components/BasisFooter';
import { t } from '@/i18n';

interface Props {
  variant: 'net' | 'timeline';
  breakdown: Breakdown;
  opts: CalcOptions;
  mode: CalcMode;
  targetNet: number | null;
  hideGross: boolean;
  onHideGrossChange: (v: boolean) => void;
  onToast: (msg: string) => void;
}

export function Card({
  variant,
  breakdown,
  opts,
  mode,
  targetNet,
  hideGross,
  onHideGrossChange,
  onToast,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  const args: CardArgs = {
    netMonthly: breakdown.netMonthly,
    annualGross: breakdown.annualGross,
    deductions: breakdown.deductions,
    year: opts.asOf.slice(0, 4),
    hideGross,
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    if (variant === 'timeline') {
      const tl = computeTimeline(breakdown.annualGross, opts);
      drawTimelineCard(ctx, {
        headline: timelineHeadline(tl.deltaDeductions, tl.baseYear),
        rows: tl.rows.map((r) => ({ label: String(r.year), value: r.netMonthly })),
      });
    } else {
      drawCard(ctx, args);
    }
  }, [variant, breakdown, opts, hideGross]);

  const path = buildDeepLinkPath({
    mode,
    amount: mode === 'reverse' ? (targetNet ?? breakdown.netMonthly) : breakdown.annualGross,
    dependents: opts.dependents,
    children: opts.children,
    nonTaxableMonthly: opts.nonTaxableMonthly,
  });

  const onSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    try {
      await saveCardImage(toBase64Png(canvas), 'netpay-card.png');
      onToast('이미지를 저장했어요');
    } catch {
      onToast(t('error.load'));
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await shareLink(APP_NAME, path, cardShareText(args));
    } catch {
      onToast(t('error.load'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <canvas ref={canvasRef} width={CARD_W} height={CARD_H} className="card-preview" />
      {variant === 'net' && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={hideGross}
            onChange={(e) => onHideGrossChange(e.target.checked)}
          />
          <span>{t('card.hideGross')}</span>
        </label>
      )}
      <div className="row">
        {canSaveImage() && (
          <button type="button" className="cta" onClick={() => void onSave()} disabled={busy}>
            {t('card.save')}
          </button>
        )}
        <button type="button" className="cta cta--secondary" onClick={() => void onShare()} disabled={busy}>
          {t('card.share')}
        </button>
      </div>
      <p className="hint">{t('card.privacy')}</p>
      <BasisFooter withYearEnd={false} />
    </main>
  );
}
