/** 설정 — docs/SCREEN_FLOW.md S10 */
import { RATES, TAX_TABLES } from '@/data';
import { rateFor } from '@/engine/rates';
import { todayIso } from '@/engine/format';
import { Icon } from '@/components/Icon';
import { t } from '@/i18n';

const VERSION = '1.0.0';
/** 콘솔 '고객문의 이메일' 과 같은 값. 빌드 가드(check:config)가 비어 있으면 막는다 */
const CONTACT = import.meta.env.VITE_SUPPORT_EMAIL ?? '';
/** 같은 개발자의 다른 미니앱. 자사 앱 링크는 intoss:// 스킴만 허용된다 */
const OTHER_APPS = [{ name: '그때 환전했다면', appName: 'fx-replay' }];

interface Props {
  onSources: () => void;
  onClearAll: () => void;
}

export function Settings({ onSources, onClearAll }: Props) {
  const table = TAX_TABLES.filter((x) => x.meta.effectiveFrom <= todayIso()).at(-1) ?? TAX_TABLES.at(-1);
  const rate = rateFor(RATES, todayIso());

  return (
    <main className="screen">
      <h3 className="section-title">{t('settings.section.basis')}</h3>
      <dl className="kv">
        <dt>{t('settings.taxTable')}</dt>
        <dd>{table?.meta.effectiveFrom ?? '-'} 시행</dd>
        <dt>{t('settings.rates')}</dt>
        <dd>{rate.from} 시행</dd>
        <dt>{t('settings.nextUpdate')}</dt>
        <dd>{t('settings.nextUpdate.value')}</dd>
      </dl>
      <div className="rows">
        <button type="button" className="rows__item" onClick={onSources}>
          {t('settings.sources')}
          <Icon name="chevronRight" />
        </button>
      </div>

      <h3 className="section-title">{t('settings.section.data')}</h3>
      <div className="rows">
        <button type="button" className="rows__item rows__item--warn" onClick={onClearAll}>
          {t('settings.clearAll')}
          <Icon name="chevronRight" />
        </button>
      </div>

      <h3 className="section-title">{t('settings.section.support')}</h3>
      <div className="rows">
        {CONTACT ? (
          <a className="rows__item" href={`mailto:${CONTACT}`}>
            {t('settings.contact')}
            <span className="rows__value">{CONTACT}</span>
            <Icon name="chevronRight" />
          </a>
        ) : (
          <p className="rows__item">
            {t('settings.contact')}
            <span className="rows__value">—</span>
          </p>
        )}
      </div>

      <h3 className="section-title">{t('settings.section.apps')}</h3>
      <div className="rows">
        {OTHER_APPS.map((app) => (
          <a key={app.appName} className="rows__item" href={`intoss://${app.appName}`}>
            {app.name}
            <Icon name="chevronRight" />
          </a>
        ))}
      </div>

      <p className="hint">{t('settings.version', { v: VERSION })}</p>
    </main>
  );
}
