/** 설정 — docs/SCREEN_FLOW.md S10 */
import { RATES, TAX_TABLES } from '@/data';
import { rateFor } from '@/engine/rates';
import { todayIso } from '@/engine/format';
import { t } from '@/i18n';

const VERSION = '1.0.0';
const CONTACT = 'k71177163@gmail.com';
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
      <button type="button" className="row-link" onClick={onSources}>
        {t('settings.sources')} ›
      </button>

      <h3 className="section-title">{t('settings.section.data')}</h3>
      <button type="button" className="row-link row-link--warn" onClick={onClearAll}>
        {t('settings.clearAll')} ›
      </button>

      <h3 className="section-title">{t('settings.section.support')}</h3>
      <a className="row-link" href={`mailto:${CONTACT}`}>
        {t('settings.contact')} ›
      </a>

      <h3 className="section-title">{t('settings.section.apps')}</h3>
      {OTHER_APPS.map((app) => (
        <a key={app.appName} className="row-link" href={`intoss://${app.appName}`}>
          {app.name} ›
        </a>
      ))}

      <p className="hint">{t('settings.version', { v: VERSION })}</p>
    </main>
  );
}
