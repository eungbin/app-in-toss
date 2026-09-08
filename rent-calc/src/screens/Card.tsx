/**
 * S04 판정 카드 — docs/SCREEN_FLOW.md S04. 무료(유입 수단이라 게이트 밖).
 * 서버가 없어 이미지 호스팅을 못 하므로, 기기에 저장하거나 딥링크를 공유한다.
 */
import { useEffect, useRef, useState } from 'react';
import { canSaveImage, saveCardImage, shareLink } from '@ait/kit';
import type { JudgeResult, TimelineRow } from '@/types';
import { CARD_H, CARD_W, cardAltText, drawCard, drawTimelineCard, renderToBase64 } from '@/engine/card';
import { shareText } from '@/engine/cardText';
import { APP_NAME, buildDeepLinkPath } from '@/engine/deeplink';
import { t } from '@/i18n';

export type CardVariant = 'judge' | 'timeline';

interface Props {
  variant: CardVariant;
  result: JudgeResult | null;
  rows: TimelineRow[];
  current: { deposit: number; rent: number };
  proposed: { deposit: number; rent: number };
  hideDeposit: boolean;
  onHideDeposit: (v: boolean) => void;
  onToast: (message: string) => void;
}

export function Card({
  variant,
  result,
  rows,
  current,
  proposed,
  hideDeposit,
  onHideDeposit,
  onToast,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  const args =
    result === null
      ? null
      : { result, proposedDeposit: proposed.deposit, proposedRent: proposed.rent, hideDeposit };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    if (variant === 'timeline') {
      drawTimelineCard(ctx, { rows, deposit: proposed.deposit || current.deposit, hideDeposit });
    } else if (args !== null) {
      drawCard(ctx, args);
    }
  }, [variant, rows, proposed.deposit, current.deposit, hideDeposit, args]);

  const save = async () => {
    setBusy(true);
    try {
      const base64 = renderToBase64((ctx) =>
        variant === 'timeline'
          ? drawTimelineCard(ctx, {
              rows,
              deposit: proposed.deposit || current.deposit,
              hideDeposit,
            })
          : args !== null && drawCard(ctx, args),
      );
      if (base64 === null) throw new Error('canvas');
      await saveCardImage(base64, 'rentcheck-card.png');
      onToast('이미지를 저장했어요');
    } catch {
      onToast(t('error.offline'));
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const path = buildDeepLinkPath({
        mode: result === null ? 'new' : 'renew',
        currentDeposit: current.deposit,
        currentRent: current.rent,
        proposedDeposit: proposed.deposit,
        proposedRent: proposed.rent,
      });
      await shareLink(APP_NAME, path, args === null ? t('card.new') : shareText(args));
    } catch {
      onToast(t('error.offline'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <canvas
        ref={canvasRef}
        className="card-preview"
        width={CARD_W}
        height={CARD_H}
        role="img"
        aria-label={args === null ? t('card.new') : cardAltText(args)}
      />

      <label className="toggle">
        <input
          type="checkbox"
          checked={hideDeposit}
          onChange={(e) => onHideDeposit(e.target.checked)}
        />
        <span>{t('card.hideDeposit')}</span>
      </label>

      <div className="row">
        {canSaveImage() && (
          <button type="button" className="cta" disabled={busy} onClick={() => void save()}>
            {t('card.save')}
          </button>
        )}
        <button type="button" className="cta cta--secondary" disabled={busy} onClick={() => void share()}>
          {t('card.share')}
        </button>
      </div>
    </div>
  );
}
