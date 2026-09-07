/** 계산 옵션 — docs/SCREEN_FLOW.md M02 */
import { CHILDREN_MAX, DEPENDENTS_MAX, DEPENDENTS_MIN, NONTAX_MEAL_DEFAULT } from '@/constants';
import { num } from '@/engine/format';
import { Sheet } from './Sheet';
import { t } from '@/i18n';

interface Props {
  dependents: number;
  children: number;
  meal: boolean;
  adjustedTo: number | null;
  onChange: (patch: { dependents?: number; children?: number; meal?: boolean }) => void;
  onClose: () => void;
}

export function OptionsSheet({ dependents, children, meal, adjustedTo, onChange, onClose }: Props) {
  return (
    <Sheet title={t('options.title')} onClose={onClose}>
      <Stepper
        label={t('options.dependents')}
        value={dependents}
        min={DEPENDENTS_MIN}
        max={DEPENDENTS_MAX}
        onChange={(v) => onChange({ dependents: v })}
        unit="명"
      />
      <Stepper
        label={t('options.children')}
        value={children}
        min={0}
        max={CHILDREN_MAX}
        onChange={(v) => onChange({ children: v })}
        unit="명"
      />
      <label className="toggle">
        <input type="checkbox" checked={meal} onChange={(e) => onChange({ meal: e.target.checked })} />
        <span>
          {t('options.nonTaxable')} ({num(NONTAX_MEAL_DEFAULT)}원)
        </span>
      </label>
      {adjustedTo !== null && <p className="note">{t('options.childrenAdjusted', { n: adjustedTo })}</p>}
      <button type="button" className="cta" onClick={onClose}>
        {t('options.apply')}
      </button>
    </Sheet>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper">
      <span className="stepper__label">{label}</span>
      <span className="stepper__ctrl">
        <button type="button" aria-label={`${label} 줄이기`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <output>
          {value}
          {unit}
        </output>
        <button type="button" aria-label={`${label} 늘리기`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </span>
    </div>
  );
}
