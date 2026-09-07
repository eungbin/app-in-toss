/**
 * 하단 탭 — docs/SCREEN_FLOW.md §1
 * 상단 네비게이션 바는 토스가 그린다. 하단 상시 이동은 미니앱이 직접 만든다.
 * 집중이 필요한 화면(플레이·결과·챕터·해설·출처)에서는 숨긴다.
 */
import type { JSX } from 'react';
import { t } from '@/i18n';

export type TabName = 'home' | 'scenarios' | 'history' | 'settings';

export const TABS: TabName[] = ['home', 'scenarios', 'history', 'settings'];

/** 라우트가 탭에 해당하는지 */
export const isTabRoute = (name: string): name is TabName => (TABS as string[]).includes(name);

const stroke = (active: boolean) => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: active ? 2.2 : 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

const ICONS: Record<TabName, (active: boolean) => JSX.Element> = {
  home: (a) => (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        d="M3.5 10.2 12 3.8l8.5 6.4V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z"
        {...stroke(a)}
      />
    </svg>
  ),
  scenarios: (a) => (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M4 6.5h16M4 12h16M4 17.5h10" {...stroke(a)} />
    </svg>
  ),
  history: (a) => (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4-6.5 4v-16a1 1 0 0 1 1-1z" {...stroke(a)} />
    </svg>
  ),
  // 톱니바퀴는 24px 에서 햇살처럼 보인다. 슬라이더 아이콘이 작은 크기에서 더 또렷하다.
  settings: (a) => (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M4 7.5h11M19 7.5h1M4 16.5h4M12 16.5h8" {...stroke(a)} />
      <circle cx="17" cy="7.5" r="2.3" {...stroke(a)} />
      <circle cx="10" cy="16.5" r="2.3" {...stroke(a)} />
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
            className="tab"
            role="tab"
            aria-selected={active}
            data-on={active}
            onClick={() => onSelect(tab)}
          >
            {ICONS[tab](active)}
            <span>{t(`tab.${tab}` as 'tab.home')}</span>
          </button>
        );
      })}
    </nav>
  );
}
