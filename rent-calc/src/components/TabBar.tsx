/**
 * 하단 탭 — docs/SCREEN_FLOW.md 1장
 *
 * 상단 네비게이션 바는 토스가 그린다. **하단 상시 이동은 미니앱이 직접 만든다.**
 * 본문 아래에 칩을 늘어놓지 않는다 — 스크롤해야 보이고, 화면마다 자리가 달라진다.
 * 떠 있는 알약 형태를 fx-replay → net-pay 에서 가져왔다(원본은 고치지 않았다).
 * 집중이 필요한 화면(판정 상세·시간축·판정 카드·저장 목록·출처)에서는 숨긴다.
 */
import type { JSX } from 'react';
import { t } from '@/i18n';

export type TabName = 'home' | 'convert' | 'broker' | 'report' | 'settings';

export const TABS: TabName[] = ['home', 'convert', 'broker', 'report', 'settings'];

export const isTabRoute = (name: string): name is TabName => (TABS as string[]).includes(name);

const stroke = (active: boolean) => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: active ? 2 : 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

const ICONS: Record<TabName, (active: boolean) => JSX.Element> = {
  // 체크 — 판정. 로고와 같은 모양이라 첫 탭이 무엇인지 바로 읽힌다
  home: (a) => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M4.5 12.4l4.2 4.2 10.8-10.8" {...stroke(a)} />
      <path d="M4.5 19.5h15" {...stroke(a)} />
    </svg>
  ),
  // 양방향 화살표 — 전세↔월세 환산
  convert: (a) => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M4 9h13.5M14.5 5.6 18.2 9M20 15H6.5M9.5 11.6 5.8 15" {...stroke(a)} />
    </svg>
  ),
  // 도장 — 중개보수
  broker: (a) => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M9 3.8h6a1 1 0 0 1 1 1V9a3 3 0 0 1-1.6 2.7l-.4.2v2.3h2.6a2 2 0 0 1 2 2v1.3H5.4V16.2a2 2 0 0 1 2-2H10v-2.3l-.4-.2A3 3 0 0 1 8 9V4.8a1 1 0 0 1 1-1z" {...stroke(a)} />
      <path d="M4.6 20.2h14.8" {...stroke(a)} />
    </svg>
  ),
  // 서류 + 체크 — 임대차 신고
  report: (a) => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M6 3.6h8.2L18 7.4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.6a1 1 0 0 1 1-1z" {...stroke(a)} />
      <path d="M13.8 3.8v3.8H17.8M8.4 14.6l2 2 3.4-3.6" {...stroke(a)} />
    </svg>
  ),
  // 톱니바퀴는 22px 에서 햇살처럼 보인다. 슬라이더가 작은 크기에서 더 또렷하다(net-pay 에서 배운 것)
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
            <span>{t(`tab.${tab}` as 'tab.home')}</span>
          </button>
        );
      })}
    </nav>
  );
}
