/**
 * 만 원 단위 히어로 입력 — docs/SCREEN_FLOW.md S01·S02
 *
 * 묻는 말을 위에 작게, 숫자를 아래에 크게 둔다. 한 줄 문장 안에 입력칸을 끼우면
 * 기기 폭에 따라 줄바꿈이 어긋나고, 화면에서 가장 큰 글자가 숫자가 아니게 된다.
 * 진입 시 자동 포커스하지 않는다 — 키패드가 결과 카드를 덮는다(비게임 체크리스트).
 */
import { useId } from 'react';

interface Props {
  /** 묻는 말. 예) "세후로 월 얼마를 받고 싶어요?" */
  question: string;
  /** 숫자 뒤 단위. 예) "만 원" */
  unit: string;
  placeholder: string;
  /** 만 원 단위 값. 비어 있으면 null */
  value: number | null;
  onChange: (v: number | null) => void;
}

const MAX_DIGITS = 7;

export function MoneyInput({ question, unit, placeholder, value, onChange }: Props) {
  const id = useId();
  const shown = value === null ? '' : value.toLocaleString('ko-KR');
  // 입력칸을 값 길이에 맞춰 줄여 단위("만 원")가 숫자 바로 뒤에 붙게 한다.
  // CSS field-sizing 은 사파리에 없어서 size 속성을 쓴다.
  const size = Math.max((shown || placeholder).length, 1);
  return (
    <label className="hero" htmlFor={id}>
      <span className="hero__q">{question}</span>
      <span className="hero__row">
        <input
          id={id}
          className="hero__field"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          size={size}
          value={shown}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, MAX_DIGITS);
            onChange(digits === '' ? null : Number(digits));
          }}
        />
        <span className="hero__unit">{unit}</span>
      </span>
    </label>
  );
}
