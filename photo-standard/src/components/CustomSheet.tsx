/** M02 직접 입력 — docs/SCREEN_FLOW.md 3장 */
import { useState } from 'react';
import { CUSTOM_MAX_PX } from '@/constants';
import { t } from '@/i18n';
import type { CustomSpec } from '@/store';
import { Sheet } from './Sheet';

interface Props {
  value: CustomSpec;
  onClose: () => void;
  onApply: (v: CustomSpec) => void;
}

/** 숫자만 남긴다. 빈 문자열은 null 로 둬서 "제한 없음"과 구분한다 */
const digits = (s: string): string => s.replace(/[^0-9]/g, '').slice(0, 5);

export function CustomSheet({ value, onClose, onApply }: Props) {
  const [w, setW] = useState(String(value.w));
  const [h, setH] = useState(String(value.h));
  const [kb, setKb] = useState(value.maxKb === null ? '' : String(value.maxKb));

  const wNum = Number(w);
  const hNum = Number(h);
  const tooLarge = wNum > CUSTOM_MAX_PX || hNum > CUSTOM_MAX_PX;
  const valid = wNum > 0 && hNum > 0 && !tooLarge;

  return (
    <Sheet onClose={onClose}>
      <div className="sheet__title">{t('custom.title')}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label className="field__name" htmlFor="cw">{t('custom.widthLabel')}</label>
          <div className="field__box">
            <input id="cw" inputMode="numeric" value={w} onChange={(e) => setW(digits(e.target.value))} />
            <span className="field__unit">px</span>
          </div>
        </div>
        <div className="field">
          <label className="field__name" htmlFor="ch">{t('custom.heightLabel')}</label>
          <div className="field__box">
            <input id="ch" inputMode="numeric" value={h} onChange={(e) => setH(digits(e.target.value))} />
            <span className="field__unit">px</span>
          </div>
        </div>
        <div className="field">
          <label className="field__name" htmlFor="ckb">{t('custom.bytesLabel')}</label>
          <div className="field__box">
            <input id="ckb" inputMode="numeric" value={kb} onChange={(e) => setKb(digits(e.target.value))} />
            <span className="field__unit">KB 이하</span>
          </div>
        </div>
        <div className="micro" style={{ paddingLeft: 52 }}>
          {tooLarge ? <span className="is-over">{t('custom.tooLarge')}</span> : t('custom.bytesHint')}
        </div>
      </div>

      <button
        type="button"
        className="btn btn--primary"
        disabled={!valid}
        onClick={() => onApply({ w: wNum, h: hNum, maxKb: kb === '' ? null : Number(kb) })}
      >
        {t('custom.apply')}
      </button>
    </Sheet>
  );
}
