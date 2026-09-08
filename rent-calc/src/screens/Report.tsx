/**
 * S07 임대차 신고 — docs/SCREEN_FLOW.md S07
 * 금액 기준만 판정한다. 지역 규칙(군 지역 제외 등)은 v1.0 범위 밖이라 각주로 알린다.
 */
import { useMemo, useState } from 'react';
import { reportRequired } from '@/engine/report';
import { MoneyInput } from '@/components/MoneyInput';
import { DateInput } from '@/components/DateInput';
import { BannerAd } from '@/components/BannerAd';
import { BasisFooter } from '@/components/BasisFooter';
import { t } from '@/i18n';

interface Props {
  initialDeposit: number;
  initialRent: number;
}

const 만 = 10_000;

export function Report({ initialDeposit, initialRent }: Props) {
  const [deposit, setDeposit] = useState<number | null>(
    initialDeposit === 0 ? null : initialDeposit / 만,
  );
  const [rent, setRent] = useState<number | null>(initialRent === 0 ? null : initialRent / 만);
  const [date, setDate] = useState('');

  const result = useMemo(() => {
    if (deposit === null && rent === null) return null;
    return reportRequired(
      (deposit ?? 0) * 만,
      (rent ?? 0) * 만,
      date === '' ? undefined : date,
    );
  }, [deposit, rent, date]);

  return (
    <div className="screen">
      <MoneyInput
        prefix={t('input.deposit')}
        suffix={t('input.unit')}
        placeholder="7000"
        value={deposit}
        onChange={setDeposit}
      />
      <MoneyInput
        prefix={t('input.rent')}
        suffix={t('input.unit')}
        placeholder="0"
        value={rent}
        onChange={setRent}
      />
      <DateInput label={t('report.contractDate')} value={date} onChange={setDate} />

      {result !== null && (
        <section className="verdict" data-verdict={result.required ? 'exceeds' : 'within'}>
          <h2>{t(result.required ? 'report.required' : 'report.notRequired')}</h2>
          <ul className="bullets">
            {result.reasons.map((r) => (
              <li key={r}>{t(r === 'deposit' ? 'report.reason.deposit' : 'report.reason.rent')}</li>
            ))}
            {result.deadline !== null && (
              <li>
                {result.overdue
                  ? t('report.overdue')
                  : t('report.deadline', { date: result.deadline })}
              </li>
            )}
          </ul>
        </section>
      )}

      <ul className="notes">
        <li>{t('report.who')}</li>
        <li>{t('report.fine')}</li>
        <li>{t('report.region')}</li>
        <li>
          <a href="https://rtms.molit.go.kr/" target="_blank" rel="noreferrer noopener">
            부동산거래관리시스템
          </a>
        </li>
      </ul>

      <BasisFooter
        basis="기준: 부동산 거래신고 등에 관한 법률"
        disclaimer={t('disclaimer.full')}
      />
      <BannerAd />
    </div>
  );
}
