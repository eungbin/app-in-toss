/**
 * S05 전세↔월세 환산 — docs/SCREEN_FLOW.md S05
 * 여기서만 사용자가 전환율을 직접 넣을 수 있다. 판정(S01)은 항상 법정 전환율을 쓴다.
 */
import { useState } from 'react';
import { depositToRent, legalConversionRate, rentToDeposit } from '@/engine/rate';
import { percentShort, won } from '@/engine/format';
import { MoneyInput } from '@/components/MoneyInput';
import { BannerAd } from '@/components/BannerAd';
import { BasisFooter } from '@/components/BasisFooter';
import { t } from '@/i18n';

interface Props {
  baseRate: number;
  asOf: string;
  overridden: boolean;
  onJudge: (deposit: number, rent: number) => void;
}

type Direction = 'toRent' | 'toDeposit';
const 만 = 10_000;

export function Convert({ baseRate, asOf, overridden, onJudge }: Props) {
  const [dir, setDir] = useState<Direction>('toRent');
  const [amount, setAmount] = useState<number | null>(null);
  const [rateText, setRateText] = useState('');

  const legal = legalConversionRate(baseRate);
  const custom = rateText === '' ? null : Number(rateText) / 100;
  const usable = custom !== null && Number.isFinite(custom) && custom > 0 && custom <= 0.5;
  const rate = usable ? custom : legal;

  const value = (amount ?? 0) * 만;
  const rent = depositToRent(value, rate);
  const deposit = value === 0 ? 0 : rentToDeposit(value, rate);

  return (
    <div className="screen">
      <div className="segment" role="group" aria-label={t('convert.title')}>
        {(['toRent', 'toDeposit'] as const).map((d) => (
          <button key={d} type="button" aria-pressed={dir === d} onClick={() => setDir(d)}>
            {t(d === 'toRent' ? 'convert.toRent' : 'convert.toDeposit')}
          </button>
        ))}
      </div>

      <MoneyInput
        prefix={t(dir === 'toRent' ? 'input.deposit' : 'input.rent')}
        suffix={t('input.unit')}
        placeholder={dir === 'toRent' ? '10000' : '50'}
        value={amount}
        onChange={setAmount}
      />

      <label className="rate-input">
        <span>{usable ? t('rate.reference', { rate: percentShort(rate) }) : '전환율'}</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder={percentShort(legal)}
          value={rateText}
          onChange={(e) => setRateText(e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))}
        />
        <span>%</span>
      </label>
      {usable && <p className="hint">{t('rate.legalNote', { legal: percentShort(legal) })}</p>}

      {amount !== null && (
        <section className="verdict" data-verdict="within">
          <h2>
            {dir === 'toRent'
              ? t('convert.resultRent', { r: won(rent) })
              : t('convert.resultDeposit', { d: won(deposit) })}
          </h2>
          {dir === 'toRent' && (
            // 연 금액은 월세×12 가 아니라 원금×전환율로 낸다.
            // 월세를 반올림한 뒤 12를 곱하면 5,000,004원 같은 잔여가 생긴다
            <p className="note">{t('convert.annual', { y: won(Math.round(value * rate)) })}</p>
          )}
          <button
            type="button"
            className="card__link"
            onClick={() =>
              dir === 'toRent' ? onJudge(value, 0) : onJudge(0, value)
            }
          >
            {t('convert.judge')} ›
          </button>
        </section>
      )}

      <BasisFooter
        basis={
          overridden
            ? t('basis.judgeManual', { br: percentShort(baseRate) })
            : t('basis.judge', { br: percentShort(baseRate), asOf })
        }
        disclaimer={t('disclaimer.full')}
      />
      <BannerAd />
    </div>
  );
}
