/** 계산 옵션 — docs/SCREEN_FLOW.md M02 */
import { CHILDREN_MAX, DEPENDENTS_MAX, DEPENDENTS_MIN, NONTAX_MEAL_DEFAULT } from '@/constants';
import { num } from '@/engine/format';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { t } from '@/i18n';

interface Props {
  dependents: number;
  children: number;
  meal: boolean;
  bonusCount: number;
  bonusAnnual: number | null;
  adjustedTo: number | null;
  onChange: (patch: {
    dependents?: number;
    children?: number;
    meal?: boolean;
    bonusCount?: number;
    bonusAnnual?: number | null;
  }) => void;
  onClose: () => void;
}

export function OptionsSheet({ dependents, children, meal, bonusCount, bonusAnnual, adjustedTo, onChange, onClose }: Props) {
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

      <Stepper
        label={t('options.bonusCount')}
        value={bonusCount}
        min={0}
        max={12}
        onChange={(v) => onChange({ bonusCount: v })}
        unit="회"
      />
      <label className="field">
        <span className="field__label">{t('options.bonusAnnual')}</span>
        <span className="field__row">
          <input
            className="field__input field__input--num"
            type="text"
            inputMode="numeric"
            value={bonusAnnual === null ? '' : bonusAnnual.toLocaleString('ko-KR')}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
              onChange({ bonusAnnual: digits === '' ? null : Number(digits) });
            }}
          />
          <span className="field__suffix">원</span>
        </span>
        <span className="field__hint">{t('options.bonusHint')}</span>
      </label>
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
          <Icon name="minus" />
        </button>
        <output>
          {value}
          {unit}
        </output>
        <button type="button" aria-label={`${label} 늘리기`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Icon name="plus" />
        </button>
      </span>
    </div>
  );
}
