/**
 * B02 공유 카드 — docs/SCREEN_FLOW.md B02
 * 게이트에 걸지 않는다. 공유 카드는 유입 수단이라 무료다(PRD 0-1).
 */
import { useEffect, useRef, useState } from 'react';
import { canSaveImage, saveCardImage, shareLink } from '@ait/kit';
import type { Breakdown } from '@/types';
import { APP_NAME } from '@/constants';
import { CARD_H, CARD_W, drawCard, toBase64Png } from '@/engine/card';
import { t } from '@/i18n';
import { Sheet } from '@/components/Sheet';

interface Props {
  result: Breakdown;
  minWageYear: number;
  hideMoney: boolean;
  onToggleHide: (v: boolean) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}

export function ShareCard({ result, minWageYear, hideMoney, onToggleHide, onToast, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawCard(ctx, {
      verdictLabel: t(`s02.verdict.${result.verdict}`),
      verdict: result.verdict,
      days: result.benefitDays,
      daily: result.benefitDaily,
      total: result.total,
      hideMoney,
      basis: t('s02.basis', { year: minWageYear }),
      disclaimer: t('s02.disclaimer'),
      appLabel: t('app.title'),
    });
  }, [result, hideMoney, minWageYear]);

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    try {
      await saveCardImage(toBase64Png(canvas), 'job-benefit-card.png');
      onToast('이미지를 저장했어요');
    } catch {
      onToast(t('ad.failed'));
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await shareLink(APP_NAME, '/', `${t('app.title')} — ${t('s02.days', { days: result.benefitDays })}`);
    } catch {
      onToast(t('ad.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={t('b02.title')} onClose={onClose}>
      <div className="sheet__scroll" style={{ maxHeight: '56vh' }}>
        <canvas ref={canvasRef} width={CARD_W} height={CARD_H} className="card-preview" />
      </div>
      <label className="toggle">
        <input type="checkbox" checked={hideMoney} onChange={(e) => onToggleHide(e.target.checked)} />
        <span>{t('b02.hideAmount')}</span>
      </label>
      {canSaveImage() ? (
        <button type="button" className="card__cta" onClick={() => void save()} disabled={busy}>
          {t('b02.save')}
        </button>
      ) : null}
      <button type="button" className="card__cta btn-primary--ghost" style={{ marginTop: 8 }} onClick={() => void share()} disabled={busy}>
        {t('s02.cta.share')}
      </button>
    </Sheet>
  );
}
