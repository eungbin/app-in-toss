/**
 * 잠금 카드 — docs/SCREEN_FLOW.md 2-3
 * 잠긴 동안에는 실제 수치를 아예 렌더하지 않는다. 흐리게만 처리하면 화면에는 안 보여도
 * DOM·접근성 트리에 값이 남고, 흐린 숫자를 "가짜 데이터"로 오해할 여지도 있다(오픈 이슈 O-2).
 */
import type { ReactNode } from 'react';
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
          🔒 {t('gate.locked')}
        </button>
      ) : (
        <button type="button" className="card__link" onClick={onOpen}>
          자세히 ›
        </button>
      )}
    </section>
  );
}
