/**
 * 게이트 시트 — docs/SCREEN_FLOW.md M01 (MZ-2)
 * 보상은 userEarnedReward 에서만 준다. 진입 즉시 자동으로 열지 않는다.
 */
import { useState } from 'react';
import { showRewarded, type RewardedState } from '@ait/kit';
import { Sheet } from './Sheet';
import { t } from '@/i18n';

interface Props {
  adState: RewardedState;
  onReward: () => void;
  onClose: () => void;
  onFail: () => void;
}

export function GateSheet({ adState, onReward, onClose, onFail }: Props) {
  const [showing, setShowing] = useState(false);

  const watch = () => {
    if (adState !== 'loaded') {
      onFail();
      return;
    }
    setShowing(true);
    showRewarded({
      onReward,
      onClosed: () => setShowing(false),
      onFailed: () => {
        setShowing(false);
        onFail();
      },
    });
  };

  return (
    <Sheet title={t('gate.title')} onClose={onClose}>
      <p className="sheet__body">{t('gate.body')}</p>
      <button type="button" className="cta" onClick={watch} disabled={showing}>
        {showing ? '광고를 불러오는 중…' : t('gate.cta')}
      </button>
      <button type="button" className="sheet__later" onClick={onClose}>
        {t('gate.later')}
      </button>
    </Sheet>
  );
}
