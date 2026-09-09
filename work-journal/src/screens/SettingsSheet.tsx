/**
 * 설정 시트 (M03) — docs/SCREEN_FLOW.md 3장
 * 구판의 세 덩어리(근무지 / 내 데이터 / 계산 기준)를 그대로 둔다.
 */
import type { Workplace } from '@/types';
import { t } from '@/i18n';
import { LEGAL, TAX_TABLES, minWageOf } from '@/data';
import { Sheet } from '@/components/Sheet';
import { Icon } from '@/components/Icon';

const INCOME_LABEL = {
  employee: 'wp.income.employee',
  daily: 'wp.income.daily',
  business: 'wp.income.business',
} as const;

interface Props {
  workplaces: Workplace[];
  /** 게이트로 합계에서 빠진 근무지 */
  lockedIds: string[];
  today: string;
  version: string;
  supportEmail: string;
  onEditWorkplace: (wp: Workplace) => void;
  onAddWorkplace: () => void;
  onExportCsv: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function SettingsSheet(props: Props) {
  const { workplaces, lockedIds, today } = props;
  const year = Number(today.slice(0, 4));
  const minWage = minWageOf(year, LEGAL);
  const table = TAX_TABLES[TAX_TABLES.length - 1];

  return (
    <Sheet onClose={props.onClose}>
      <div className="sheet__bar">
        <button type="button" className="sheet__close" onClick={props.onClose}>
          닫기
        </button>
        <div className="sheet__title">{t('settings.title')}</div>
        <span className="sheet__spacer" />
      </div>

      <div className="sheet__body">
        <div className="stack" style={{ gap: 18 }}>
          <section className="stack" style={{ gap: 10 }}>
            <div className="form__section-h">
              <div className="form__section-t">{t('settings.workplaces')}</div>
              <button type="button" className="card__link" onClick={props.onAddWorkplace}>
                {t('settings.add')}
              </button>
            </div>

            <div className="list">
              {workplaces.map((w) => {
                const locked = lockedIds.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    className={locked ? 'list__item list__item--locked list__muted' : 'list__item'}
                    onClick={() => props.onEditWorkplace(w)}
                  >
                    <span className="list__l">
                      <span
                        className="list__dot"
                        style={{ background: `var(--wp-${w.color})`, opacity: locked ? 0.5 : 1 }}
                      />
                      <span>
                        <span className="list__t">
                          {w.name}
                          {locked ? <Icon name="lock" size={14} width={1.6} /> : null}
                        </span>
                        <span className="list__s" style={{ display: 'block' }}>
                          {locked
                            ? t('gate.locked.workplace')
                            : t('settings.wp.sub', {
                                income: t(INCOME_LABEL[w.incomeType]),
                                wage: `${w.hourlyWage.toLocaleString('ko-KR')}원`,
                                payday: w.payday,
                              })}
                        </span>
                      </span>
                    </span>
                    <Icon name="chevronRight" size={14} width={1.8} />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="stack" style={{ gap: 10 }}>
            <div className="form__section-t">{t('settings.data')}</div>
            <div className="list">
              <button type="button" className="list__item" onClick={props.onExportCsv}>
                {t('settings.csv')}
                <Icon name="chevronRight" size={14} width={1.8} />
              </button>
              <button type="button" className="list__item list__item--danger" onClick={props.onClearAll}>
                {t('settings.clear')}
                <Icon name="chevronRight" size={14} width={1.8} />
              </button>
            </div>
            <p className="field__note">{t('settings.data.note')}</p>
          </section>

          <section className="basis">
            <div className="basis__t">{t('settings.basis.title')}</div>
            <p className="basis__b">
              {t('settings.basis.body', {
                y: minWage.year,
                eff: table?.meta.effectiveFrom ?? '',
              })}
            </p>
          </section>

          <div className="metarow">
            <a href={LEGAL.sources[0]?.url ?? '#'}>{t('settings.links.sources')}</a>
            <span className="metarow__sep">·</span>
            <a href={`mailto:${props.supportEmail}`}>{t('settings.links.contact')}</a>
            <span className="metarow__sep">·</span>
            <a href="intoss://net-pay/">{t('settings.links.apps')}</a>
            <span className="metarow__ver">{t('settings.version', { v: props.version })}</span>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
