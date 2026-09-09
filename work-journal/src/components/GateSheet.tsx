/**
 * 게이트 시트 — docs/FUNCTIONAL_SPEC.md §3-10, §3-11
 * 사용자가 잠긴 것을 눌렀을 때만 뜬다. 진입 즉시 자동으로 열지 않는다.
 * 보상은 userEarnedReward 에서만 지급한다 — dismissed 만으로는 열지 않는다.
 */
import { useEffect, useState } from 'react';
import { adsSupported, preloadRewarded, showRewarded, type RewardedState } from '@ait/kit';
import { t } from '@/i18n';
import { Sheet } from './Sheet';
import { Icon } from './Icon';

interface Props {
  onClose: () => void;
  onReward: () => void;
  onUnavailable: () => void;
}

export function GateSheet({ onClose, onReward, onUnavailable }: Props) {
  const [state, setState] = useState<RewardedState>('idle');
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (!adsSupported()) {
      setState('failed');
      return;
    }
    return preloadRewarded(setState);
  }, []);

  const play = () => {
    if (state !== 'loaded') {
      onUnavailable();
      return;
    }
    setShowing(true);
    showRewarded({
      onReward: () => {
        onReward();
        onClose();
      },
      onClosed: () => setShowing(false),
      onFailed: () => {
        setShowing(false);
        onUnavailable();
      },
    });
  };

  return (
    <Sheet onClose={onClose}>
      <div className="gate">
        <div className="gate__icon">
          <Icon name="lock" size={26} />
        </div>
        <h2 className="gate__t">{t('gate.title')}</h2>
        <p className="gate__b">{t('gate.body')}</p>
        <div className="stack" style={{ gap: 8 }}>
          <button type="button" className="btn" onClick={play} disabled={showing || state === 'loading'}>
            {state === 'loading' ? '광고 준비 중' : t('gate.cta')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('gate.later')}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
