/**
 * 공유 카드 (S02) — docs/SCREEN_FLOW.md 3장
 * 게이트 밖이다. 서버가 없는 이 앱에서 신규 유입 수단은 이 카드 하나다.
 */
import { useEffect, useRef } from 'react';
import { canSaveImage, saveCardImage, shareLink } from '@ait/kit';
import type { MonthSummary } from '@/types';
import { t } from '@/i18n';
import { CARD_H, CARD_W } from '@/constants';
import { cardShareText, drawCard, toBase64Png, type CardArgs } from '@/engine/card';
import { hourText, monthOf } from '@/engine/date';
import { Sheet } from '@/components/Sheet';

interface Props {
  month: string;
  summary: MonthSummary;
  places: number;
  hideMoney: boolean;
  onToggleHide: (v: boolean) => void;
  onSaved: () => void;
  onFailed: () => void;
  onClose: () => void;
}

export function ShareCard(props: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const args: CardArgs = {
    month: monthOf(props.month).month,
    hoursText: hourText(props.summary.workMin),
    net: props.summary.net,
    gross: props.summary.gross,
    weeklyCount: props.summary.weeklyHolidayCount,
    places: props.places,
    hideMoney: props.hideMoney,
  };

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) drawCard(ctx, args);
  });

  const save = async () => {
    const canvas = ref.current;
    if (!canvas) return;
    try {
      await saveCardImage(toBase64Png(canvas), 'work-journal-card.png');
      props.onSaved();
    } catch {
      props.onFailed();
    }
  };

  const share = async () => {
    try {
      await shareLink('work-journal', '/', cardShareText(args));
    } catch {
      props.onFailed();
    }
  };

  return (
    <Sheet onClose={props.onClose}>
      <div className="sheet__bar">
        <button type="button" className="sheet__close" onClick={props.onClose}>
          닫기
        </button>
        <div className="sheet__title">{t('card.title')}</div>
        <span className="sheet__spacer" />
      </div>

      <div className="sheet__body">
        <div className="sharewrap">
          <div className="sharecard">
            <canvas ref={ref} width={CARD_W} height={CARD_H} />
          </div>

          <div className="shareopts">
            <span className="shareopts__k">{t('card.hide')}</span>
            <button
              type="button"
              className="switch"
              aria-pressed={props.hideMoney}
              aria-label={t('card.hide')}
              onClick={() => props.onToggleHide(!props.hideMoney)}
            >
              <span className="switch__knob" />
            </button>
          </div>
        </div>
      </div>

      <div className="sheet__foot">
        {/* 기기가 이미지 저장을 지원하지 않으면 버튼 자리를 비우지 않고 공유 하나로 채운다 */}
        {canSaveImage() ? (
          <div className="btn-row">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void save()}>
              {t('card.saveImage')}
            </button>
            <button type="button" className="btn btn--sm" onClick={() => void share()}>
              {t('card.shareLink')}
            </button>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => void share()}>
            {t('card.shareLink')}
          </button>
        )}
      </div>
    </Sheet>
  );
}
