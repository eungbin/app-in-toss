/**
 * 계산 방향 전환 — docs/SCREEN_FLOW.md S01·S02
 *
 * 예전에는 "지금 연봉이 있다면 → 연봉으로 계산" 같은 텍스트 링크였다. 역산이 이 앱의
 * 차별점인데 두 방향이 링크에 숨어 있으면 무엇을 하는 앱인지 첫 화면에서 읽히지 않는다.
 * 세그먼트로 두 방향을 늘 보여 주고, 지금 어느 방향인지도 함께 드러낸다.
 */
import { t } from '@/i18n';

interface Props {
  mode: 'reverse' | 'forward';
  onChange: () => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="modes" role="group" aria-label={t('home.mode.label')}>
      <button
        type="button"
        className={`modes__btn ${mode === 'reverse' ? 'modes__btn--on' : ''}`}
        aria-pressed={mode === 'reverse'}
        onClick={mode === 'reverse' ? undefined : onChange}
      >
        {t('home.mode.reverse')}
      </button>
      <button
        type="button"
        className={`modes__btn ${mode === 'forward' ? 'modes__btn--on' : ''}`}
        aria-pressed={mode === 'forward'}
        onClick={mode === 'forward' ? undefined : onChange}
      >
        {t('home.mode.forward')}
      </button>
    </div>
  );
}
