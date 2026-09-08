/**
 * S06 중개보수 상한 — docs/SCREEN_FLOW.md S06
 * 요율은 상한이고 실제 금액은 협의로 정한다. 부가세는 계산하지 않고 "별도"만 표기한다
 * (일반·간이과세 여부를 앱이 알 수 없다).
 */
import { useMemo, useState } from 'react';
import type { OfficetelKind } from '@/types';
import { brokerage } from '@/data';
import { brokerageCap } from '@/engine/brokerage';
import { percentShort, won } from '@/engine/format';
import { MoneyInput } from '@/components/MoneyInput';
import { RadioGroup } from '@/components/RadioGroup';
import { BannerAd } from '@/components/BannerAd';
import { BasisFooter } from '@/components/BasisFooter';
import { t } from '@/i18n';

interface Props {
  initialDeposit: number;
  initialRent: number;
}

const 만 = 10_000;

export function Broker({ initialDeposit, initialRent }: Props) {
  const [deposit, setDeposit] = useState<number | null>(
    initialDeposit === 0 ? null : initialDeposit / 만,
  );
  const [rent, setRent] = useState<number | null>(initialRent === 0 ? null : initialRent / 만);
  const [officetel, setOfficetel] = useState<OfficetelKind>('no');

  const result = useMemo(() => {
    if (deposit === null && rent === null) return null;
    return brokerageCap(
      {
        kind: 'lease',
        deposit: (deposit ?? 0) * 만,
        rent: (rent ?? 0) * 만,
        officetel,
      },
      brokerage,
    );
  }, [deposit, rent, officetel]);

  return (
    <div className="screen">
      <MoneyInput
        prefix={t('input.deposit')}
        suffix={t('input.unit')}
        placeholder="3000"
        value={deposit}
        onChange={setDeposit}
      />
      <MoneyInput
        prefix={t('input.rent')}
        suffix={t('input.unit')}
        placeholder="50"
        value={rent}
        onChange={setRent}
      />

      <RadioGroup<OfficetelKind>
        legend={t('broker.officetel.q')}
        value={officetel}
        options={[
          { value: 'no', label: t('broker.officetel.no') },
          { value: 'qualified', label: t('broker.officetel.qualified') },
          { value: 'other', label: t('broker.officetel.other') },
        ]}
        onChange={setOfficetel}
      />

      {result !== null && (
        <section className="verdict" data-verdict="within">
          <h2>
            {result.negotiable
              ? t('broker.negotiable', { fee: won(result.fee) })
              : t('broker.result', { fee: won(result.fee) })}
          </h2>
          <dl>
            <div>
              <dt>거래금액</dt>
              <dd>
                {result.usedMultiplier === 0
                  ? won(result.tx)
                  : t('broker.tx', { tx: won(result.tx), mult: String(result.usedMultiplier) })}
              </dd>
            </div>
            <div>
              <dt>요율</dt>
              <dd>
                {result.cap !== null && result.rawFee > result.cap
                  ? t('broker.capApplied', {
                      ratio: percentShort(result.ratio),
                      raw: won(result.rawFee),
                      cap: won(result.cap),
                    })
                  : t('broker.ratioOnly', { ratio: percentShort(result.ratio) })}
              </dd>
            </div>
          </dl>
          {result.usedMultiplier === 70 && <p className="note">{t('broker.tx70')}</p>}
        </section>
      )}

      <ul className="notes">
        <li>{t('broker.isCap')}</li>
        <li>{t('broker.ordinance')}</li>
      </ul>

      <BasisFooter basis={t('basis.broker')} disclaimer={t('disclaimer.full')} />
      <BannerAd />
    </div>
  );
}
