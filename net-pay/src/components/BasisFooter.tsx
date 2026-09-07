/** 기준·면책·개인정보 한 줄 — 원칙 B1·B2·B4, C4. 결과가 보이는 모든 화면에 붙는다 */
import { t } from '@/i18n';

interface Props {
  effectiveFrom?: string;
  year?: string;
  /** 개인정보 문구까지 붙일지(홈·카드 화면) */
  withPrivacy?: boolean;
  withYearEnd?: boolean;
}

export function BasisFooter({ effectiveFrom, year, withPrivacy, withYearEnd = true }: Props) {
  return (
    <footer className="basis">
      {withPrivacy && <p>{t('privacy.line')}</p>}
      {effectiveFrom && year && <p>{t('basis.line', { effectiveFrom, year })}</p>}
      <p>{t('disclaimer.full')}</p>
      {withYearEnd && <p>{t('disclaimer.yearEnd')}</p>}
    </footer>
  );
}
