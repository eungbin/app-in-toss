/**
 * M02 기준금리·전환율 — docs/SCREEN_FLOW.md M02
 * 기준금리는 금통위 결정에 따라 바뀌므로 앱 갱신 없이도 사용자가 고칠 수 있어야 한다(DT-5).
 */
import { useState } from 'react';
import { Sheet } from './Sheet';
import { legalConversionRate } from '@/engine/rate';
import { percentShort } from '@/engine/format';
import { t } from '@/i18n';

interface Props {
  baseRate: number;
  bundledRate: number;
  asOf: string;
  onApply: (rate: number | undefined) => void;
  onClose: () => void;
}

/** 기준금리 입력 허용 범위(%) */
const MIN = 0;
const MAX = 20;

export function RateSheet({ baseRate, bundledRate, asOf, onApply, onClose }: Props) {
  const [text, setText] = useState((baseRate * 100).toFixed(2));
  const parsed = Number(text);
  const valid = Number.isFinite(parsed) && parsed >= MIN && parsed <= MAX;
  const preview = valid ? legalConversionRate(parsed / 100) : legalConversionRate(baseRate);

  return (
    <Sheet title={t('settings.baseRate')} onClose={onClose}>
      <label className="rate-input">
        <span>{t('settings.baseRate')}</span>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))}
        />
        <span>%</span>
      </label>
      <p className="hint">{asOf} 공시 기준 · 번들값 {percentShort(bundledRate)}%</p>
      <p className="hint">{t('rate.legalFormula')}</p>
      <p className="sheet__body">
        {t('rate.chip', { br: valid ? text : percentShort(baseRate), rate: percentShort(preview) })}
      </p>
      <button type="button" className="cta" disabled={!valid} onClick={() => onApply(parsed / 100)}>
        {t('rate.apply')}
      </button>
      <button type="button" className="sheet__later" onClick={() => onApply(undefined)}>
        {t('rate.reset')}
      </button>
    </Sheet>
  );
}
