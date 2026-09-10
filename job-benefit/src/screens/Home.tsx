/**
 * S01 판정 입력 (홈) — docs/SCREEN_FLOW.md S01
 *
 * 진입 즉시 시트를 열지 않는다. 자동 포커스도 하지 않는다.
 * 하단 버튼을 비활성으로 두지 않는다 — 누르면 첫 빈 칸으로 데려간다(work-journal 2026-09-10).
 */
import { useRef } from 'react';
import type { Draft } from '@/types';
import { t } from '@/i18n';
import { BannerAd } from '@/components/BannerAd';
import { Icon } from '@/components/Icon';

interface Props {
  draft: Draft;
  tenureLabel: string | null;
  onChange: (patch: Partial<Draft>) => void;
  onOpenReasons: () => void;
  onSubmit: () => void;
  onSettings: () => void;
  onEmpty: (message: string) => void;
}

const digits = (v: string, max: number): string => v.replace(/[^0-9]/g, '').slice(0, max);
const comma = (v: number | null): string => (v === null ? '' : v.toLocaleString('ko-KR'));

export function Home({ draft, tenureLabel, onChange, onOpenReasons, onSubmit, onSettings, onEmpty }: Props) {
  const hiredRef = useRef<HTMLInputElement>(null);
  const quitRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const weekRef = useRef<HTMLInputElement>(null);
  const wageRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const missing: Array<[boolean, React.RefObject<HTMLInputElement>]> = [
      [draft.hiredDate === '', hiredRef],
      [draft.quitDate === '', quitRef],
      [draft.ageAtQuit === null, ageRef],
      [draft.weekHours === null, weekRef],
      [draft.monthlyWage === null, wageRef],
    ];
    const first = missing.find(([bad]) => bad);
    if (first) {
      const el = first[1].current;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
      onEmpty(t('s01.submit.empty'));
      return;
    }
    onSubmit();
  };

  return (
    <>
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: '12px 0 0', fontSize: 'var(--fs-title)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {t('app.title')}
            </h1>
            <p className="hint" style={{ marginTop: 6 }}>
              {t('app.subtitle')}
            </p>
          </div>
          <button
            type="button"
            className="sheet__close"
            style={{ marginTop: 14 }}
            aria-label={t('s04.source.title')}
            onClick={onSettings}
          >
            <Icon name="chevronRight" />
          </button>
        </div>

        <p className="section-title">{t('s01.reason.label')}</p>
        <div className="card" style={{ marginTop: 8, padding: '6px 16px' }}>
          <ul className="list list--plain" style={{ margin: 0 }}>
            {(['involuntary', 'voluntary', 'voluntaryJustified'] as const).map((kind, i, all) => (
              <li key={kind} className="list__item" style={{ gap: 10, ...(i === all.length - 1 ? { borderBottom: 'none' } : {}) }}>
                <span className="list__pick">
                  <input
                    type="radio"
                    name="reason"
                    checked={draft.reason === kind}
                    onChange={() => onChange({ reason: kind, justifiedItem: undefined })}
                  />
                </span>
                <span className="list__body">
                  <span className="list__name">
                    {t(kind === 'involuntary' ? 's01.reason.involuntary' : kind === 'voluntary' ? 's01.reason.voluntary' : 's01.reason.justified')}
                  </span>
                  {kind === 'voluntaryJustified' ? (
                    <button
                      type="button"
                      className="card__link"
                      style={{ margin: '2px 0 0', minHeight: 24 }}
                      onClick={onOpenReasons}
                    >
                      {draft.justifiedItem ? `${draft.justifiedItem}번 선택함 · 바꾸기` : t('s01.reason.justified.link')}
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="section-title">{t('s01.period.label')}</p>
        <div className="card" style={{ marginTop: 8 }}>
          <label className="field" style={{ marginTop: 0 }}>
            <span className="field__label">{t('s01.period.hired')}</span>
            <span className="field__row">
              <input
                ref={hiredRef}
                className="field__input"
                type="date"
                value={draft.hiredDate}
                onChange={(e) => onChange({ hiredDate: e.target.value })}
              />
            </span>
          </label>
          <label className="field">
            <span className="field__label">{t('s01.period.quit')}</span>
            <span className="field__row">
              <input
                ref={quitRef}
                className="field__input"
                type="date"
                value={draft.quitDate}
                onChange={(e) => onChange({ quitDate: e.target.value })}
              />
            </span>
          </label>
          {tenureLabel !== null ? (
            <p className="hint" style={{ marginTop: 10 }}>
              {tenureLabel}
            </p>
          ) : null}
        </div>

        <p className="section-title">{t('s01.age.label')}</p>
        <div className="card" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px' }}>
          <span className="field" style={{ marginTop: 0, flex: 'none' }}>
            <span className="field__row">
              <input
                ref={ageRef}
                className="field__input field__input--num"
                style={{ flex: 'none', width: 76 }}
                type="text"
                inputMode="numeric"
                value={draft.ageAtQuit === null ? '' : String(draft.ageAtQuit)}
                onChange={(e) => {
                  const d = digits(e.target.value, 3);
                  onChange({ ageAtQuit: d === '' ? null : Number(d) });
                }}
              />
              <span className="field__suffix">{t('s01.age.unit')}</span>
            </span>
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <span className="list__pick">
              <input type="checkbox" checked={draft.disabled} onChange={(e) => onChange({ disabled: e.target.checked })} />
            </span>
            <span style={{ fontSize: 'var(--fs-body)', fontWeight: 500 }}>{t('s01.age.disabled')}</span>
          </label>
        </div>

        <p className="section-title">{t('s01.hours.label')}</p>
        <div className="card" style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <label className="field" style={{ marginTop: 0 }}>
              <span className="field__label">{t('s01.hours.week')}</span>
              <span className="field__row">
                <input
                  ref={weekRef}
                  className="field__input field__input--num"
                  type="text"
                  inputMode="numeric"
                  value={draft.weekHours === null ? '' : String(draft.weekHours)}
                  onChange={(e) => {
                    const d = digits(e.target.value, 3);
                    onChange({ weekHours: d === '' ? null : Number(d) });
                  }}
                />
                <span className="field__suffix">{t('s01.hours.unit')}</span>
              </span>
            </label>
            <label className="field" style={{ marginTop: 0 }}>
              <span className="field__label">{t('s01.hours.holiday')}</span>
              <span className="field__row">
                <input
                  className="field__input field__input--num"
                  type="text"
                  inputMode="numeric"
                  value={draft.holidayHours === null ? '' : String(draft.holidayHours)}
                  onChange={(e) => {
                    const d = digits(e.target.value, 3);
                    onChange({ holidayHours: d === '' ? null : Number(d) });
                  }}
                />
                <span className="field__suffix">{t('s01.hours.unit')}</span>
              </span>
            </label>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            {t('s01.hours.hint')}
          </p>
        </div>

        <p className="section-title">{t('s01.wage.label')}</p>
        <div className="card" style={{ marginTop: 8 }}>
          <span className="field" style={{ marginTop: 0 }}>
            <span className="field__row">
              <input
                ref={wageRef}
                className="field__input field__input--num"
                type="text"
                inputMode="numeric"
                value={comma(draft.monthlyWage)}
                onChange={(e) => {
                  const d = digits(e.target.value, 9);
                  onChange({ monthlyWage: d === '' ? null : Number(d) });
                }}
              />
              <span className="field__suffix">{t('s01.wage.unit')}</span>
            </span>
          </span>
          <p className="hint" style={{ marginTop: 10 }}>
            {t('s01.wage.hint')}
          </p>
        </div>

        <BannerAd />
      </div>

      <div className="bottom-bar">
        <button type="button" className="btn-primary" onClick={submit}>
          {t('s01.submit')}
        </button>
      </div>
    </>
  );
}
