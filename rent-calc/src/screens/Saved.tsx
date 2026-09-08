/** S08 저장 목록 — docs/SCREEN_FLOW.md S08. 비교 화면은 v1.0에 없다(확정) */
import type { Scenario } from '@/types';
import { manwon, percent } from '@/engine/format';
import { BannerAd } from '@/components/BannerAd';
import { t } from '@/i18n';

interface Props {
  scenarios: Scenario[];
  cap: number;
  locked: boolean;
  onOpen: (s: Scenario) => void;
  onDelete: (id: string) => void;
  onUnlock: () => void;
}

export function Saved({ scenarios, cap, locked, onOpen, onDelete, onUnlock }: Props) {
  return (
    <div className="screen">
      {scenarios.length === 0 ? (
        <p className="hint">{t('save.empty')}</p>
      ) : (
        <ul className="saved-list">
          {scenarios.map((s) => (
            <li key={s.id}>
              <button type="button" className="saved-list__main" onClick={() => onOpen(s)}>
                <span className="saved-list__badge">
                  {t(s.input.mode === 'renew' ? 'mode.renew' : 'mode.new')}
                </span>
                <span className="saved-list__terms">
                  {t('input.deposit')} {manwon(s.input.proposed.deposit)}
                  {t('input.unit')} · {t('input.rent')} {manwon(s.input.proposed.rent)}
                  {t('input.unit')}
                </span>
                <span className="saved-list__verdict">
                  {s.result.verdict === null
                    ? '환산'
                    : s.result.verdict === 'within'
                      ? `${percent(s.result.increase)}% 상한 안`
                      : `${percent(s.result.increase)}% 상한 초과`}
                </span>
                <span className="saved-list__date">{s.createdAt.slice(5, 10)}</span>
              </button>
              <button
                type="button"
                className="saved-list__delete"
                aria-label={t('save.delete')}
                onClick={() => onDelete(s.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="hint">
        ({scenarios.length}/{cap})
      </p>
      {locked && (
        <button type="button" className="cta cta--secondary" onClick={onUnlock}>
          🔒 {t('gate.locked')}
        </button>
      )}
      <BannerAd />
    </div>
  );
}
