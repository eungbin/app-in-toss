/**
 * 저장 상한 해제 시트 — docs/FUNCTIONAL_SPEC.md §3-9, docs/SCREEN_FLOW.md M01
 *
 * 보상은 `userEarnedReward` 에서만 지급한다. 닫기만으로는 열리지 않는다.
 */
import { useState } from 'react';
import { showRewarded } from '@ait/kit';
import { SAVE_FREE_PER_DAY } from '@/constants';
import { midnightAfter } from '@/engine/gate';
import { t } from '@/i18n';
import { Sheet } from './Sheet';
import { IconPlay } from './Icon';

interface Props {
  onClose: () => void;
  onEarned: (until: number) => void;
}

export function GateSheet({ onClose, onEarned }: Props) {
  const [showing, setShowing] = useState(false);
  const [failed, setFailed] = useState(false);

  const play = () => {
    setShowing(true);
    setFailed(false);
    showRewarded({
      onReward: () => onEarned(midnightAfter(new Date())),
      onClosed: () => setShowing(false),
      onFailed: () => {
        setShowing(false);
        setFailed(true);
      },
    });
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="sheet__title">{t('gate.title', { n: SAVE_FREE_PER_DAY })}</div>
        <div className="body-2">{failed ? t('gate.failed') : t('gate.body')}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" className="btn btn--primary" onClick={play} disabled={showing}>
          {showing ? (
            <>
              <span className="spinner" />
              {t('gate.loading')}
            </>
          ) : (
            <>
              <IconPlay size={18} color="#fff" />
              {t('gate.cta')}
            </>
          )}
        </button>
        <button type="button" className="btn btn--sub btn--ghost" onClick={onClose}>
          {t('gate.later')}
        </button>
      </div>
    </Sheet>
  );
}
