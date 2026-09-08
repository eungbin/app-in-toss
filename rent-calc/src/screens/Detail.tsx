/**
 * S02 판정 상세 — docs/SCREEN_FLOW.md S02
 * 산식을 그대로 보여 사용자가 검산할 수 있게 한다. 배너는 두지 않는다.
 */
import type { JudgeResult } from '@/types';
import { INCREASE_CAP } from '@/constants';
import { percent, percentShort, won } from '@/engine/format';
import { FormulaTable, type Row } from '@/components/FormulaTable';
import { BasisFooter } from '@/components/BasisFooter';
import { t } from '@/i18n';

interface Props {
  result: JudgeResult;
  current: { deposit: number; rent: number };
  proposed: { deposit: number; rent: number };
  asOf: string;
  /** 기준금리를 사용자가 직접 넣었는지 — 그럴 때는 "한국은행 공시"를 붙이지 않는다 */
  overridden: boolean;
  /** 전세 → 월세 전환 제안인지. 해설집 안내 문구를 붙일지 결정한다 */
  isConversion: boolean;
}

const itemPct = (v: number | null): string => (v === null ? '—' : `${percent(v)}%`);

export function Detail({ result, current, proposed, asOf, overridden, isConversion }: Props) {
  const allowed = result.currentEq * (1 + INCREASE_CAP);

  const rows: Row[] = [
    { label: t('input.deposit'), before: won(current.deposit), after: won(proposed.deposit) },
    { label: t('input.rent'), before: won(current.rent), after: won(proposed.rent) },
    {
      label: t('detail.eqDeposit'),
      before: won(result.currentEq),
      after: won(result.proposedEq),
    },
    { label: t('detail.increase'), value: `${percent(result.increase)}% (상한 5%)` },
    {
      label: t('detail.itemIncrease'),
      value: `${t('input.deposit')} ${itemPct(result.itemIncrease.deposit)} · ${t('input.rent')} ${itemPct(result.itemIncrease.rent)}`,
    },
    { label: t('detail.allowed'), value: won(Math.round(allowed)) },
  ];

  if (result.verdict === 'exceeds') {
    rows.push({
      label: t('detail.excess'),
      value: `${t('detail.eqDeposit')} ${won(result.excessAsDeposit)} = ${t('input.rent')} ${won(result.excessAsRent)}`,
    });
  }

  return (
    <div className="screen">
      <FormulaTable
        head={{ item: t('detail.item'), before: t('detail.before'), after: t('detail.after') }}
        rows={rows}
      />

      <section className="card">
        <h2 className="card__headline">{t('detail.maxTitle')}</h2>
        <ul className="bullets">
          <li>
            {result.maxRentForProposedDeposit === null
              ? t('judge.maxDeposit', { max: won(result.maxDepositForProposedRent ?? 0) })
              : t('judge.maxRent', { max: won(result.maxRentForProposedDeposit) })}
          </li>
          {result.maxDepositForProposedRent !== null && (
            <li>
              제안 월세 그대로면 보증금은 최대 {won(result.maxDepositForProposedRent)}원까지예요
            </li>
          )}
        </ul>
      </section>

      <p className="hint">
        {t('detail.rateApplied', {
          rate: percentShort(result.legalRate),
          br: percentShort(result.baseRate),
        })}
      </p>

      <ul className="notes">
        {result.withinOneYear === true && <li>{t('judge.oneYear')}</li>}
        <li>{t('judge.notNew')}</li>
        {result.verdict === 'exceeds' && (
          <>
            <li>{t('judge.consentRenewal')}</li>
            <li>{t('judge.consentNew')}</li>
          </>
        )}
        {isConversion && <li>{t('judge.conversionConsent')}</li>}
        <li>
          <a
            href="https://adrhome.reb.or.kr/adrhome/reb/main"
            target="_blank"
            rel="noreferrer noopener"
          >
            {t('judge.consult')}
          </a>
        </li>
      </ul>

      <BasisFooter
        basis={
          overridden
            ? t('basis.judgeManual', { br: percentShort(result.baseRate) })
            : t('basis.judge', { br: percentShort(result.baseRate), asOf })
        }
        disclaimer={t('disclaimer.full')}
      />
    </div>
  );
}
