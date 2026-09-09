/**
 * 기록 시트 (M01) — docs/SCREEN_FLOW.md 3장
 * 값이 바뀔 때마다 미리보기를 다시 계산한다. 구판 필드 순서를 그대로 지킨다.
 */
import { useMemo, useState } from 'react';
import type { WorkRecord, Workplace } from '@/types';
import { t } from '@/i18n';
import { BREAK_MIN_MAX, EXTRA_PAY_MAX, TIME_STEP_MIN } from '@/constants';
import { findOverlap, splitShift, validateRecord } from '@/engine/shift';
import { dayPay } from '@/engine/pay';
import { dowLabel, hhmm, hourText, monthKey } from '@/engine/date';
import { Sheet } from '@/components/Sheet';
import { DateField, Field, NumberField, SelectField, TextField, TimeField, ToggleCard } from '@/components/Field';

const won = (n: number): string => `${n.toLocaleString('ko-KR')}원`;
const plus = (n: number): string => `+${n.toLocaleString('ko-KR')}원`;

interface Props {
  /** 수정이면 기존 기록, 추가면 초기값 */
  initial: WorkRecord;
  isEdit: boolean;
  workplaces: Workplace[];
  /** 겹침 검사 대상 — 근무지를 가리지 않고 전부 넘긴다 */
  others: WorkRecord[];
  onSave: (rec: WorkRecord, previousMonth?: string) => void;
  onDelete: (rec: WorkRecord) => void;
  onClose: () => void;
}

export function RecordSheet({ initial, isEdit, workplaces, others, onSave, onDelete, onClose }: Props) {
  const [rec, setRec] = useState<WorkRecord>(initial);
  const patch = (p: Partial<WorkRecord>) => setRec((r) => ({ ...r, ...p }));

  const wp = workplaces.find((w) => w.id === rec.workplaceId) ?? workplaces[0];
  const err = validateRecord(rec);
  // 시간 자체가 말이 안 되면 겹침을 볼 필요가 없다
  const clash = useMemo(() => (err === null ? findOverlap(rec, others) : null), [err, rec, others]);
  const blocked = err !== null || clash !== null;
  const split = useMemo(() => splitShift(rec), [rec]);
  const pay = useMemo(() => (wp ? dayPay(split, rec, wp) : null), [split, rec, wp]);
  const overnight = rec.end < rec.start;

  if (!wp) return null;

  return (
    <Sheet onClose={onClose}>
      <div className="sheet__bar">
        <button type="button" className="sheet__close" onClick={onClose}>
          닫기
        </button>
        <div className="sheet__title">{isEdit ? t('record.title.edit') : t('record.title')}</div>
        <span className="sheet__spacer" />
      </div>

      <div className="sheet__body">
        <div className="form">
          {/* 근무지가 하나면 고를 것이 없다 — 숨긴다 */}
          {workplaces.length > 1 ? (
            <Field label={t('record.workplace')}>
              <SelectField
                value={rec.workplaceId}
                options={workplaces.map((w) => ({ value: w.id, label: w.name }))}
                onChange={(v) => patch({ workplaceId: v })}
                ariaLabel={t('record.workplace')}
                dotColor={`var(--wp-${wp.color})`}
              />
            </Field>
          ) : null}

          <Field label={t('record.date')}>
            <DateField value={rec.date} onChange={(iso) => patch({ date: iso })} ariaLabel={t('record.date')} />
          </Field>

          <div className="form__grid">
            <Field label={t('record.start')}>
              <TimeField
                value={rec.start}
                onChange={(v) => patch({ start: v })}
                step={TIME_STEP_MIN}
                ariaLabel={t('record.start')}
              />
            </Field>
            <Field label={t('record.end')} badge={overnight ? t('record.nextDay') : undefined}>
              <TimeField
                value={rec.end}
                onChange={(v) => patch({ end: v })}
                step={TIME_STEP_MIN}
                ariaLabel={t('record.end')}
              />
            </Field>
          </div>

          <div className="form__grid">
            <Field label={t('record.break')} error={err === 'breakTooLong' ? t('record.err.breakTooLong') : undefined}>
              <NumberField
                value={rec.breakMin}
                onChange={(n) => patch({ breakMin: n })}
                unit={t('record.break.unit')}
                max={BREAK_MIN_MAX}
                bad={err === 'breakTooLong'}
                ariaLabel={t('record.break')}
              />
            </Field>
            <Field label={t('record.extra')}>
              <NumberField
                value={rec.extraPay}
                onChange={(n) => patch({ extraPay: n })}
                unit={t('record.extra.unit')}
                max={EXTRA_PAY_MAX}
                placeholder="0"
                ariaLabel={t('record.extra')}
              />
            </Field>
          </div>

          <ToggleCard
            title={t('record.holiday.title')}
            sub={t('record.holiday.sub')}
            checked={rec.holiday}
            onChange={(v) => patch({ holiday: v })}
          />

          <Field label={t('record.memo')} hint={t('record.memo.optional')}>
            <TextField
              value={rec.memo}
              onChange={(s) => patch({ memo: s })}
              placeholder={t('record.memo.placeholder')}
              ariaLabel={t('record.memo')}
            />
          </Field>

          {/* 미리보기 */}
          {!blocked && pay ? (
            <div className="preview">
              <div className="row">
                <span className="row__k">{t('record.preview.work')}</span>
                <span className="row__v">{hourText(split.work)}</span>
              </div>
              <div className="row">
                <span className="row__k">{t('record.preview.base')}</span>
                <span className="row__v">{won(pay.base)}</span>
              </div>
              {pay.overtimePay > 0 ? (
                <div className="row">
                  <span className="row__k">{t('record.preview.overtime', { m: split.overtime })}</span>
                  <span className="row__v">{plus(pay.overtimePay)}</span>
                </div>
              ) : null}
              {pay.nightPay > 0 ? (
                <div className="row">
                  <span className="row__k">{t('record.preview.night', { m: split.night })}</span>
                  <span className="row__v">{plus(pay.nightPay)}</span>
                </div>
              ) : null}
              {pay.holidayPay > 0 ? (
                <div className="row">
                  <span className="row__k">{t('record.preview.holiday')}</span>
                  <span className="row__v">{plus(pay.holidayPay)}</span>
                </div>
              ) : null}
              {pay.extra > 0 ? (
                <div className="row">
                  <span className="row__k">{t('record.preview.extra')}</span>
                  <span className="row__v">{plus(pay.extra)}</span>
                </div>
              ) : null}
              <div className="rule" />
              <div className="preview__total">
                <span className="preview__k">{t('record.preview.total')}</span>
                <span className="preview__v">{won(pay.total)}</span>
              </div>
            </div>
          ) : (
            <div className="notice">
              {clash !== null ? (
                <span>
                  {t('record.err.overlap', {
                    date: `${Number(clash.date.slice(5, 7))}월 ${Number(clash.date.slice(8, 10))}일 (${dowLabel(clash.date)})`,
                    from: hhmm(clash.start),
                    to: hhmm(clash.end),
                  })}
                  <br />
                  {t('record.err.overlap.hint')}
                </span>
              ) : (
                t(err === 'sameTime' ? 'record.err.sameTime' : 'record.err.breakTooLong')
              )}
            </div>
          )}

          <p className="field__note">{t('record.note.night')}</p>
          {/* 5인 미만이면 가산이 붙지 않는다. 시간은 참고로 보여 준다 */}
          {!wp.fivePlus && (split.night > 0 || split.overtime > 0) ? (
            <p className="field__note">
              {t('record.note.under5', { night: split.night, overtime: split.overtime })}
            </p>
          ) : null}

          {isEdit ? (
            <button type="button" className="btn btn--text" onClick={() => onDelete(rec)}>
              {t('record.delete')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="sheet__foot">
        <button
          type="button"
          className="btn"
          disabled={blocked}
          onClick={() => onSave(rec, isEdit ? monthKey(initial.date) : undefined)}
        >
          {t('record.save')}
        </button>
      </div>
    </Sheet>
  );
}
