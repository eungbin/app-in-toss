/** 보증금 + 월세 한 묶음 — docs/SCREEN_FLOW.md S01 */
import { MoneyInput } from './MoneyInput';
import { t } from '@/i18n';

export interface TermsDraft {
  /** 만 원 단위. 비어 있으면 null */
  deposit: number | null;
  rent: number | null;
}

interface Props {
  title: string;
  value: TermsDraft;
  onChange: (v: TermsDraft) => void;
  depositPlaceholder: string;
  rentPlaceholder: string;
}

export function TermsGroup({ title, value, onChange, depositPlaceholder, rentPlaceholder }: Props) {
  return (
    <section className="terms-group">
      <h2>{title}</h2>
      <MoneyInput
        prefix={t('input.deposit')}
        suffix={t('input.unit')}
        placeholder={depositPlaceholder}
        value={value.deposit}
        onChange={(deposit) => onChange({ ...value, deposit })}
      />
      <MoneyInput
        prefix={t('input.rent')}
        suffix={t('input.unit')}
        placeholder={rentPlaceholder}
        value={value.rent}
        onChange={(rent) => onChange({ ...value, rent })}
      />
    </section>
  );
}
