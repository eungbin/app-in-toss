/**
 * S04 설정 — docs/SCREEN_FLOW.md S04
 * 외부 링크는 출처·고객문의만. 다른 미니앱은 `intoss://` 스킴만 쓴다(자사 앱 설치 유도 금지).
 */
import { BENEFIT_DAYS, LEGAL, MIN_WAGE } from '@/data';
import { OTHER_APPS, SUPPORT_EMAIL, VERSION } from '@/constants';
import { t } from '@/i18n';
import { BannerAd } from '@/components/BannerAd';
import { Icon } from '@/components/Icon';

interface Props {
  minWageYear: number;
  onClearAll: () => void;
}

/** 2019-08-27 → 2019. 8. 27. — 화면의 다른 날짜 표기와 맞춘다 */
const dotted = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${y}. ${Number(m)}. ${Number(d)}.` : iso;
};

export function Settings({ minWageYear, onClearAll }: Props) {
  const wage = MIN_WAGE.minWage.find((w) => w.year === minWageYear) ?? MIN_WAGE.minWage[MIN_WAGE.minWage.length - 1];
  return (
    <div className="screen">
      <p className="section-title" style={{ marginTop: 16 }}>
        {t('s04.source.title')}
      </p>
      <div className="card" style={{ marginTop: 8 }}>
        <table className="detail" style={{ marginTop: 0 }}>
          <tbody>
            <tr className="detail__row">
              <th>고용보험법</th>
              <td>시행 2026. 8. 20.</td>
            </tr>
            <tr className="detail__row">
              <th>별표 1 소정급여일수</th>
              <td>개정 {dotted(BENEFIT_DAYS.meta.amendedOn)}</td>
            </tr>
            <tr className="detail__row">
              <th>시행령 제68조 상한</th>
              <td>{LEGAL.baseDailyCap.toLocaleString('ko-KR')}원</td>
            </tr>
            <tr className="detail__row">
              <th>{wage?.year}년 최저임금</th>
              <td>{wage?.hourly.toLocaleString('ko-KR')}원</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="section-title">{t('s04.about.title')}</p>
      <div className="card" style={{ marginTop: 8 }}>
        <p style={{ margin: 0, fontSize: 'var(--fs-body)', color: 'var(--text-2)', lineHeight: 1.6 }}>
          {t('s04.about.privacy')}
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 'var(--fs-body)', color: 'var(--text-2)', lineHeight: 1.6 }}>
          {t('s04.about.notOfficial')}
        </p>
      </div>

      <button type="button" className="card__cta btn-primary--ghost" onClick={onClearAll}>
        {t('s04.clear')}
      </button>

      <p className="section-title">{t('s04.others.title')}</p>
      <ul className="list" style={{ marginTop: 8 }}>
        {OTHER_APPS.map((app) => (
          <li key={app.scheme} className="list__item">
            <a className="list__body" href={app.scheme}>
              <span className="list__name">{t(app.key)}</span>
              <span className="list__sub">{app.sub}</span>
            </a>
            <Icon name="chevronRight" size={20} />
          </li>
        ))}
        {SUPPORT_EMAIL === '' ? null : (
          <li className="list__item" style={{ borderBottom: 'none' }}>
            <a className="list__body" href={`mailto:${SUPPORT_EMAIL}`}>
              <span className="list__name">{t('s04.support')}</span>
              <span className="list__sub">{SUPPORT_EMAIL}</span>
            </a>
            <Icon name="chevronRight" size={20} />
          </li>
        )}
      </ul>

      <div className="basis">
        <p>버전 {VERSION}</p>
      </div>

      <BannerAd />
    </div>
  );
}
