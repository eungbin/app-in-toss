/**
 * 게이트 시트 — docs/SCREEN_FLOW.md B03 (MZ-1·MZ-2)
 * 사용자가 잠긴 것을 눌렀을 때만 뜬다. 보상은 onReward(userEarnedReward)에서만 준다 —
 * dismissed 로는 열지 않는다.
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
    <Sheet title={t('b03.title')} onClose={onClose}>
      <p className="sheet__body">{t('b03.body')}</p>
      <button type="button" className="card__cta" onClick={watch} disabled={showing}>
        {showing ? '광고를 불러오는 중…' : t('b03.cta')}
      </button>
      <button type="button" className="sheet__later" onClick={onClose}>
        나중에 볼게요
      </button>
    </Sheet>
  );
}
