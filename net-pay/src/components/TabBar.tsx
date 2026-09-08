/**
 * 하단 탭 — docs/SCREEN_FLOW.md 1장
 *
 * 상단 네비게이션 바는 토스가 그린다. 하단 상시 이동은 미니앱이 직접 만든다.
 * fx-replay 의 떠 있는 알약 형태를 가져왔다(원본은 고치지 않았다).
 * 집중이 필요한 화면(공제 상세·시간축·협상 카드·비교·출처)에서는 숨긴다.
 */
import type { JSX } from 'react';
import { t } from '@/i18n';

export type TabName = 'calc' | 'severance' | 'leave' | 'saved' | 'settings';

export const TABS: TabName[] = ['calc', 'severance', 'leave', 'saved', 'settings'];

/** 라우트가 탭에 해당하는지 */
export const isTabRoute = (name: string): name is TabName => (TABS as string[]).includes(name);

const stroke = (active: boolean) => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: active ? 2 : 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

const ICONS: Record<TabName, (active: boolean) => JSX.Element> = {
  // 계산기
  calc: (a) => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M6 3.6h12a1 1 0 0 1 1 1v14.8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.6a1 1 0 0 1 1-1z" {...stroke(a)} />
      <path d="M8.4 8h7.2M8.6 12h2.2M8.6 15.8h2.2M14 12v3.8" {...stroke(a)} />
    </svg>
  ),
  // 가방 — 퇴직
  severance: (a) => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M4 8.4h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" {...stroke(a)} />
      <path d="M9 8.4V6.2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.2M4 13h16" {...stroke(a)} />
    </svg>
  ),
  // 달력 — 연차
  leave: (a) => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M5 5.4h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.4a1 1 0 0 1 1-1z" {...stroke(a)} />
      <path d="M8.4 3.8v3.2M15.6 3.8v3.2M4 10.4h16M8.6 14.4h2M13.4 14.4h2" {...stroke(a)} />
    </svg>
  ),
  // 북마크 — 저장
  saved: (a) => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M6.5 3.6h11a1 1 0 0 1 1 1v15.8l-6.5-4-6.5 4V4.6a1 1 0 0 1 1-1z" {...stroke(a)} />
    </svg>
  ),
  // 톱니바퀴는 22px 에서 햇살처럼 보인다. 슬라이더가 작은 크기에서 더 또렷하다
  settings: (a) => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M4 7.6h11M19 7.6h1M4 16.4h4M12 16.4h8" {...stroke(a)} />
      <circle cx="17" cy="7.6" r="2.3" {...stroke(a)} />
      <circle cx="10" cy="16.4" r="2.3" {...stroke(a)} />
    </svg>
  ),
};

interface Props {
  current: TabName;
  onSelect: (tab: TabName) => void;
}

export function TabBar({ current, onSelect }: Props) {
  return (
    <nav className="tabbar" role="tablist">
      {TABS.map((tab) => {
        const active = tab === current;
        return (
          <button
            key={tab}
            type="button"
            className="tab"
            role="tab"
            aria-selected={active}
            data-on={active}
            onClick={() => onSelect(tab)}
          >
            {ICONS[tab](active)}
            <span>{t(`tab.${tab}` as 'tab.calc')}</span>
          </button>
        );
      })}
    </nav>
  );
}
