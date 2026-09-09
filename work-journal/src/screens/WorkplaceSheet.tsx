/**
 * 근무지 시트 (M02) — docs/SCREEN_FLOW.md 3장
 * 구판 필드 15개를 그대로 두고, 세금·4대보험 섹션만 **일반 근로일 때 펼친다**.
 * 일용·사업소득이면 그 값을 쓰지 않으므로 접어서 폼을 절반으로 줄인다.
 */
import { useState } from 'react';
import type { IncomeType, Workplace, WorkplaceColor } from '@/types';
import { t } from '@/i18n';
import { CHILDREN_MAX, DEPENDENTS_MAX, PAYDAY_MAX, WAGE_MAX } from '@/constants';
import { LEGAL, RATES, minWageOf } from '@/data';
import { rateFor } from '@/engine/rates';
import { pct } from '@/engine/format';
import { Sheet } from '@/components/Sheet';
import { ColorSwatches, Field, NumberField, Segment, TextField, ToggleCard } from '@/components/Field';

interface Props {
  initial: Workplace;
  isEdit: boolean;
  /** 이 근무지의 기록 수 — 삭제 확인 문구에 쓴다 */
  recordCount: number;
  today: string;
  onSave: (wp: Workplace) => void;
  onDelete: (wp: Workplace, recordCount: number) => void;
  onClose: () => void;
}

export function WorkplaceSheet({ initial, isEdit, recordCount, today, onSave, onDelete, onClose }: Props) {
  const [wp, setWp] = useState<Workplace>(initial);
  const patch = (p: Partial<Workplace>) => setWp((w) => ({ ...w, ...p }));

  const year = Number(today.slice(0, 4));
  const minWage = minWageOf(year, LEGAL);
  const rate = rateFor(RATES, today);
  const belowMinWage = wp.hourlyWage > 0 && wp.hourlyWage < minWage.hourly;

  const nameBad = wp.name.trim() === '';
  const wageBad = wp.hourlyWage <= 0;

  return (
    <Sheet onClose={onClose}>
      <div className="sheet__bar">
        <button type="button" className="sheet__close" onClick={onClose}>
          닫기
        </button>
        <div className="sheet__title">{isEdit ? t('wp.title.edit') : t('wp.title.new')}</div>
        <span className="sheet__spacer" />
      </div>

      <div className="sheet__body">
        <div className="form">
          <Field label={t('wp.name')}>
            <TextField
              value={wp.name}
              onChange={(s) => patch({ name: s })}
              placeholder={t('wp.name.placeholder')}
              ariaLabel={t('wp.name')}
            />
          </Field>

          <Field
            label={t('wp.wage')}
            note={t('wp.wage.note', { y: minWage.year, n: minWage.hourly.toLocaleString('ko-KR') })}
            noteWarn={belowMinWage}
          >
            <NumberField
              value={wp.hourlyWage}
              onChange={(n) => patch({ hourlyWage: n })}
              unit="원"
              max={WAGE_MAX}
              ariaLabel={t('wp.wage')}
            />
          </Field>

          <Field label={t('wp.size')} note={t('wp.size.note')}>
            <Segment
              value={wp.fivePlus ? 'over' : 'under'}
              options={[
                { value: 'under', label: t('wp.size.under') },
                { value: 'over', label: t('wp.size.over') },
              ]}
              onChange={(v) => patch({ fivePlus: v === 'over' })}
            />
          </Field>

          <Field label={t('wp.payday')}>
            <NumberField
              value={wp.payday}
              onChange={(n) => patch({ payday: Math.max(1, Math.min(PAYDAY_MAX, n)) })}
              unit={t('wp.payday.unit')}
              max={PAYDAY_MAX}
              ariaLabel={t('wp.payday')}
            />
          </Field>

          <div className="form__sep" />

          <div className="form__section">
            <div className="form__section-t">{t('wp.section.income')}</div>
            <Field label={t('wp.incomeType')} note={t('wp.income.note')}>
              <Segment<IncomeType>
                value={wp.incomeType}
                options={[
                  { value: 'employee', label: t('wp.income.employee') },
                  { value: 'daily', label: t('wp.income.daily') },
                  { value: 'business', label: t('wp.income.business') },
                ]}
                onChange={(v) => patch({ incomeType: v })}
              />
            </Field>
          </div>

          <div className="form__sep" />

          <div className="form__section">
            <div className="form__section-t">{t('wp.section.weekly')}</div>
            <ToggleCard
              title={t('wp.weekly.title')}
              sub={t('wp.weekly.sub')}
              checked={wp.weeklyHolidayAuto}
              onChange={(v) => patch({ weeklyHolidayAuto: v })}
            />
          </div>

          {/* 일반 근로일 때만 — 나머지 유형은 이 값을 쓰지 않는다 */}
          {wp.incomeType === 'employee' ? (
            <>
              <div className="form__sep" />
              <div className="form__section">
                <div className="form__section-h">
                  <div className="form__section-t">{t('wp.section.tax')}</div>
                  <div className="field__note">{t('wp.tax.hint')}</div>
                </div>

                <div className="form__grid">
                  <Field label={t('wp.dependents')} hint={t('wp.dependents.hint')}>
                    <NumberField
                      value={wp.dependents}
                      onChange={(n) => patch({ dependents: Math.max(1, Math.min(DEPENDENTS_MAX, n)) })}
                      unit={t('wp.person.unit')}
                      max={DEPENDENTS_MAX}
                      ariaLabel={t('wp.dependents')}
                    />
                  </Field>
                  <Field label={t('wp.children')}>
                    <NumberField
                      value={wp.children}
                      onChange={(n) => patch({ children: Math.min(CHILDREN_MAX, n) })}
                      unit={t('wp.person.unit')}
                      max={CHILDREN_MAX}
                      ariaLabel={t('wp.children')}
                    />
                  </Field>
                </div>

                <Field label={t('wp.nonTax')} hint={t('wp.optional')}>
                  <NumberField
                    value={wp.nonTaxableMonthly}
                    onChange={(n) => patch({ nonTaxableMonthly: n })}
                    unit="원"
                    max={10_000_000}
                    placeholder="0"
                    ariaLabel={t('wp.nonTax')}
                  />
                </Field>

                <Field label={t('wp.taxRatio')}>
                  <Segment<0.8 | 1 | 1.2>
                    value={wp.taxRatio}
                    options={[
                      { value: 0.8, label: '80%' },
                      { value: 1, label: '100%' },
                      { value: 1.2, label: '120%' },
                    ]}
                    onChange={(v) => patch({ taxRatio: v })}
                  />
                </Field>

                <div className="stack" style={{ gap: 8 }}>
                  <ToggleCard
                    title={t('wp.nps')}
                    sub={t('wp.nps.sub', { y: year, r: pct(rate.nps.totalRate * rate.nps.employeeShare) })}
                    checked={wp.insurance.nps}
                    onChange={(v) => patch({ insurance: { ...wp.insurance, nps: v } })}
                  />
                  <ToggleCard
                    title={t('wp.nhis')}
                    sub={t('wp.nhis.sub', { r: pct(rate.nhis.totalRate * rate.nhis.employeeShare) })}
                    checked={wp.insurance.nhis}
                    onChange={(v) => patch({ insurance: { ...wp.insurance, nhis: v } })}
                  />
                  <ToggleCard
                    title={t('wp.ei')}
                    sub={t('wp.ei.sub', { r: pct(rate.ei.totalRate * rate.ei.employeeShare) })}
                    checked={wp.insurance.ei}
                    onChange={(v) => patch({ insurance: { ...wp.insurance, ei: v } })}
                  />
                </div>

                <Field label={t('wp.reported')} hint={t('wp.optional')} note={t('wp.reported.note')}>
                  <NumberField
                    value={wp.reportedMonthly}
                    onChange={(n) => patch({ reportedMonthly: n })}
                    unit="원"
                    max={100_000_000}
                    placeholder={t('wp.reported.placeholder')}
                    ariaLabel={t('wp.reported')}
                  />
                </Field>
              </div>
            </>
          ) : null}

          <div className="form__sep" />

          <Field label={t('wp.color')}>
            <ColorSwatches value={wp.color} onChange={(c: WorkplaceColor) => patch({ color: c })} />
          </Field>

          {isEdit ? (
            <button type="button" className="btn btn--text" onClick={() => onDelete(wp, recordCount)}>
              {t('wp.delete')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="sheet__foot">
        <button type="button" className="btn" disabled={nameBad || wageBad} onClick={() => onSave(wp)}>
          {t('wp.save')}
        </button>
      </div>
    </Sheet>
  );
}
