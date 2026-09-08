/** S09 설정 — docs/SCREEN_FLOW.md S09 */
import { percentShort } from '@/engine/format';
import { t } from '@/i18n';

interface Props {
  baseRate: number;
  bundledRate: number;
  asOf: string;
  overridden: boolean;
  onOpenRate: () => void;
  onOpenSources: () => void;
  onClearAll: () => void;
}

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? '';

export function Settings({
  baseRate,
  bundledRate,
  asOf,
  overridden,
  onOpenRate,
  onOpenSources,
  onClearAll,
}: Props) {
  return (
    <div className="screen">
      <ul className="menu">
        <li>
          <button type="button" onClick={onOpenRate}>
            <span>{t('settings.baseRate')}</span>
            <span className="menu__value">
              {percentShort(baseRate)}%{overridden ? ` ${t('basis.override')}` : ` (${asOf})`}
            </span>
          </button>
        </li>
        <li>
          <button type="button" onClick={onOpenSources}>
            <span>{t('settings.sources')}</span>
            <span className="menu__value">›</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={onClearAll}>
            <span>{t('settings.clearAll')}</span>
          </button>
        </li>
        <li>
          <span>{t('settings.support')}</span>
          <span className="menu__value">
            {SUPPORT_EMAIL === '' ? '—' : <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>}
          </span>
        </li>
      </ul>

      <h2 className="section-title">{t('settings.otherApps')}</h2>
      <ul className="menu">
        <li>
          <a href="intoss://net-pay">
            <span>세후로 말해줘</span>
            <span className="menu__value">›</span>
          </a>
        </li>
        <li>
          <a href="intoss://fx-replay">
            <span>그때 환전했다면</span>
            <span className="menu__value">›</span>
          </a>
        </li>
      </ul>

      <p className="notes">{t('sources.notAffiliated')}</p>
      {overridden && <p className="hint">번들 기준금리는 {percentShort(bundledRate)}%예요</p>}
    </div>
  );
}
