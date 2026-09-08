/** 라디오 묶음 — docs/SCREEN_FLOW.md S06 오피스텔 3상태 */
import { useId } from 'react';

interface Props<T extends string> {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function RadioGroup<T extends string>({ legend, value, options, onChange }: Props<T>) {
  const name = useId();
  return (
    <fieldset className="radio-group">
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="radio-group__item">
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
