/**
 * 잠금 카드 — docs/SCREEN_FLOW.md 2-3
 * 잠긴 동안에는 실제 수치를 아예 렌더하지 않는다. 흐리게만 처리하면 화면에는 안 보여도
 * DOM·접근성 트리에 값이 남고, 흐린 숫자를 "가짜 데이터"로 오해할 여지도 있다(오픈 이슈 O-2).
 */
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { t } from '@/i18n';

interface Props {
  title: string;
  locked: boolean;
  /** 잠금 상태에서 보여줄 자리표시자 */
  placeholder: ReactNode;
  onUnlock: () => void;
  onOpen: () => void;
  children: ReactNode;
}

export function LockedCard({ title, locked, placeholder, onUnlock, onOpen, children }: Props) {
  return (
    <section className="card card--locked">
      <h2 className="card__headline">{title}</h2>
      {locked ? <div className="locked-body">{placeholder}</div> : children}
      {locked ? (
        <button type="button" className="card__cta" onClick={onUnlock}>
          <Icon name="lock" />
          {t('gate.locked')}
        </button>
      ) : (
        <button type="button" className="card__link" onClick={onOpen}>
          {t('common.more')}
          <Icon name="chevronRight" />
        </button>
      )}
    </section>
  );
}

/**
 * 잠긴 값 자리표시자. 숫자를 계산하지도, 렌더하지도 않는다.
 *
 * 점(●,●●●,●●●) 으로 가리면 가짜 숫자나 오류처럼 보인다. 열면 무엇이 나오는지
 * (연도별 막대 차트) 알 수 있는 실루엣을 대신 둔다. 높이는 고정 패턴이라
 * 실제 데이터를 짐작하게 하지 않는다.
 */
const SILHOUETTE = [44, 58, 52, 74, 66, 100];

export function BarSilhouette({ n }: { n: number }) {
  const bars = Array.from({ length: Math.max(2, Math.min(n, SILHOUETTE.length)) }, (_, i) => {
    const h = SILHOUETTE[i] ?? 60;
    return { h, last: i === Math.min(n, SILHOUETTE.length) - 1 };
  });
  return (
    <div className="silhouette" aria-hidden="true">
      {bars.map((b, i) => (
        <div
          key={i}
          className={`silhouette__bar ${b.last ? 'silhouette__bar--last' : ''}`}
          style={{ height: `${b.h}%` }}
        />
      ))}
    </div>
  );
}
