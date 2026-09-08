/** 만 원 단위 숫자 입력 — docs/SCREEN_FLOW.md S01·S02 */
import { useId } from 'react';

interface Props {
  prefix: string;
  suffix: string;
  placeholder: string;
  /** 만 원 단위 값. 비어 있으면 null */
  value: number | null;
  onChange: (v: number | null) => void;
}

const MAX_DIGITS = 7;

export function MoneyInput({ prefix, suffix, placeholder, value, onChange }: Props) {
  const id = useId();
  return (
    <label className="money-input" htmlFor={id}>
      <span className="money-input__prefix">{prefix}</span>
      <input
        id={id}
        className="money-input__field"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value === null ? '' : value.toLocaleString('ko-KR')}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, MAX_DIGITS);
          onChange(digits === '' ? null : Number(digits));
        }}
      />
      <span className="money-input__suffix">{suffix}</span>
    </label>
  );
}
