/**
 * 입력 화면 — docs/SCREEN_FLOW.md S01 (계산 탭 1단계)
 *
 * 결과는 이 화면에 얹지 않는다. [계산하기]로 결과 화면(S02)으로 넘어간다.
 * 한 화면에 입력과 결과를 다 넣으면 무엇을 하는 화면인지 흐려지고, 키패드가
 * 결과를 덮는다. 입력창에 자동 포커스하지 않는다(비게임 체크리스트).
 */
import type { CalcOptions } from '@/types';
import { NONTAX_MEAL_DEFAULT } from '@/constants';
import { isDevData } from '@/data';
import { MoneyInput } from '@/components/MoneyInput';
import { ModeToggle } from '@/components/ModeToggle';
import { Icon } from '@/components/Icon';
import { t } from '@/i18n';

export interface Draft {
  mode: 'reverse' | 'forward';
  /** 입력값(만 원). 비어 있으면 null */
  amountManwon: number | null;
  dependents: number;
  children: number;
  meal: boolean;
  /** 연 상여 횟수. 0이면 상여 분리를 하지 않는다 */
  bonusCount: number;
  /** 연 상여 총액 (연봉에 포함된 금액) */
  bonusAnnual: number | null;
}

/** 키패드를 덜 두드리게 하는 증감 폭(만 원) */
const QUICK = [10, 50, 100];

interface Props {
  draft: Draft;
  opts: CalcOptions;
  hasBonus: boolean;
  staleYear: string | null;
  onAmount: (v: number | null) => void;
  onToggleMode: () => void;
  onOptions: () => void;
  onCalc: () => void;
}

export function Input(p: Props) {
  const { draft, opts } = p;
  const reverseMode = draft.mode === 'reverse';
  const ready = draft.amountManwon !== null && draft.amountManwon > 0;

  return (
    <main className="screen">
      {isDevData && <p className="dev-banner">{t('data.dev')}</p>}
      {p.staleYear && (
        <p className="dev-banner">
          {t('data.stale', { y: p.staleYear, y0: opts.asOf.slice(0, 4) })}
        </p>
      )}

      <ModeToggle mode={draft.mode} onChange={p.onToggleMode} />

      <MoneyInput
        question={reverseMode ? t('home.input.question') : t('gross.input.question')}
        unit={t('home.input.unit')}
        placeholder={reverseMode ? t('home.input.placeholder') : '4100'}
        value={draft.amountManwon}
        onChange={p.onAmount}
      />

      <div className="quick">
        {QUICK.map((n) => (
          <button
            key={n}
            type="button"
            className="quick__btn"
            onClick={() => p.onAmount((draft.amountManwon ?? 0) + n)}
          >
            {t('input.quick', { n })}
          </button>
        ))}
      </div>

      <h2 className="section-title">{t('input.section.options')}</h2>
      <div className="chips">
        <button type="button" className="chip" onClick={p.onOptions}>
          {t('input.chip.dependents', { n: opts.dependents })}
        </button>
        <button type="button" className="chip" onClick={p.onOptions}>
          {t('input.chip.children', { n: opts.children })}
        </button>
        <button
          type="button"
          className={`chip ${draft.meal ? 'chip--on' : ''}`}
          onClick={p.onOptions}
        >
          {draft.meal
            ? t('input.chip.mealOn', { n: NONTAX_MEAL_DEFAULT / 10_000 })
            : t('input.chip.mealOff')}
        </button>
        <button
          type="button"
          className={`chip ${p.hasBonus ? 'chip--on' : ''}`}
          onClick={p.onOptions}
        >
          {p.hasBonus ? (
            t('input.chip.bonusOn', { n: draft.bonusCount })
          ) : (
            <>
              <Icon name="plus" />
              {t('input.chip.bonusOff')}
            </>
          )}
        </button>
      </div>

      <p className="hint">{reverseMode ? t('home.input.hint') : t('gross.input.hint')}</p>

      <button type="button" className="cta" disabled={!ready} onClick={p.onCalc}>
        {reverseMode ? t('input.cta.reverse') : t('input.cta.forward')}
        <Icon name="chevronRight" />
      </button>
    </main>
  );
}
