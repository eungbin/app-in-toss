/** 날짜 입력 — 네이티브 date. 값이 없으면 빈 문자열 */
import { useId } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function DateInput({ label, value, onChange }: Props) {
  const id = useId();
  return (
    <label className="date-input" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
