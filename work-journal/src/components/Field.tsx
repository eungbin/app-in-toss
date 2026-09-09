/**
 * 입력 컴포넌트 — docs/SCREEN_FLOW.md 7장
 * 값이 바뀔 때마다 상위가 다시 계산하므로 전부 제어 컴포넌트다.
 */
import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface FieldProps {
  label: string;
  /** 라벨 뒤에 회색으로 붙는 말 — "(선택)", "(본인 포함)" */
  hint?: string;
  badge?: string;
  note?: string;
  noteWarn?: boolean;
  error?: string;
  children: ReactNode;
}

export function Field({ label, hint, badge, note, noteWarn, error, children }: FieldProps) {
  return (
    <div className="field">
      <div className="field__label">
        <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{label}</span>
        {hint ? <span>{hint}</span> : null}
        {badge ? <span className="field__badge">{badge}</span> : null}
      </div>
      {children}
      {error ? <div className="field__err">{error}</div> : null}
      {note && !error ? <div className={noteWarn ? 'field__note field__note--warn' : 'field__note'}>{note}</div> : null}
    </div>
  );
}

interface NumberFieldProps {
  value: number;
  onChange: (n: number) => void;
  unit?: string;
  max: number;
  placeholder?: string;
  bad?: boolean;
  ariaLabel: string;
}

/** 숫자만 받는 입력. 콤마를 넣어 보여 주고 값은 정수로 돌려준다 */
export function NumberField({ value, onChange, unit, max, placeholder, bad, ariaLabel }: NumberFieldProps) {
  return (
    <div className={bad ? 'field__box field__box--bad' : 'field__box'}>
      <input
        className="field__input"
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={value === 0 && placeholder ? '' : value.toLocaleString('ko-KR')}
        placeholder={placeholder}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 12);
          onChange(Math.min(max, digits === '' ? 0 : Number(digits)));
        }}
      />
      {unit ? <span className="field__unit">{unit}</span> : null}
    </div>
  );
}

interface TextFieldProps {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  maxLength?: number;
  ariaLabel: string;
}

export function TextField({ value, onChange, placeholder, maxLength = 40, ariaLabel }: TextFieldProps) {
  return (
    <div className="field__box">
      <input
        className="field__input field__input--text"
        type="text"
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface TimeFieldProps {
  /** 자정 기준 분 */
  value: number;
  onChange: (minutes: number) => void;
  step: number;
  ariaLabel: string;
}

/** 시각 입력 — 네이티브 time 입력을 쓴다. 기기 피커가 가장 익숙하다 */
export function TimeField({ value, onChange, step, ariaLabel }: TimeFieldProps) {
  const hh = String(Math.floor(value / 60)).padStart(2, '0');
  const mm = String(value % 60).padStart(2, '0');
  return (
    <div className="field__box">
      <input
        className="field__input"
        type="time"
        aria-label={ariaLabel}
        step={step * 60}
        value={`${hh}:${mm}`}
        onChange={(e) => {
          const [h, m] = e.target.value.split(':');
          if (h === undefined || m === undefined) return;
          onChange(Number(h) * 60 + Number(m));
        }}
      />
    </div>
  );
}

interface DateFieldProps {
  value: string;
  onChange: (iso: string) => void;
  ariaLabel: string;
}

export function DateField({ value, onChange, ariaLabel }: DateFieldProps) {
  return (
    <div className="field__box">
      <input
        className="field__input"
        type="date"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
      />
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
  /** 왼쪽에 붙는 색 점 */
  dotColor?: string;
}

export function SelectField<T extends string>({ value, options, onChange, ariaLabel, dotColor }: SelectFieldProps<T>) {
  return (
    <div className="field__box">
      {dotColor ? <span className="list__dot" style={{ background: dotColor }} /> : null}
      <select
        className="field__select"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="field__unit" aria-hidden="true">
        <Icon name="chevronDown" size={14} width={1.8} />
      </span>
    </div>
  );
}

interface SegmentProps<T extends string | number> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segment<T extends string | number>({ value, options, onChange }: SegmentProps<T>) {
  return (
    <div className="seg" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className="seg__btn"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface ToggleCardProps {
  title: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function ToggleCard({ title, sub, checked, onChange }: ToggleCardProps) {
  return (
    <button type="button" className="toggle" aria-pressed={checked} onClick={() => onChange(!checked)}>
      <span>
        <span className="toggle__t">{title}</span>
        {sub ? <span className="toggle__s" style={{ display: 'block' }}>{sub}</span> : null}
      </span>
      <span className={checked ? 'toggle__box toggle__box--on' : 'toggle__box'}>
        {checked ? <Icon name="check" size={14} width={2.4} /> : null}
      </span>
    </button>
  );
}

const COLOR_VALUES = ['purple', 'blue', 'green', 'orange', 'red'] as const;

interface SwatchesProps {
  value: string;
  onChange: (c: (typeof COLOR_VALUES)[number]) => void;
}

export function ColorSwatches({ value, onChange }: SwatchesProps) {
  return (
    <div className="swatches">
      {COLOR_VALUES.map((c) => (
        <button
          key={c}
          type="button"
          className="swatch"
          aria-pressed={c === value}
          aria-label={c}
          onClick={() => onChange(c)}
        >
          <span className="swatch__in" style={{ background: `var(--wp-${c})` }} />
        </button>
      ))}
    </div>
  );
}
