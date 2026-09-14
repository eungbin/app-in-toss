/**
 * 하단 탭 — docs/SCREEN_FLOW.md 1장, 아이콘 규칙은 docs/SHARED_PACKAGE.md 8-6
 *
 * 상단 네비게이션 바는 토스가 그린다. **하단 상시 이동은 미니앱이 직접 만든다.**
 * 본문 아래에 칩을 늘어놓지 않는다 — 스크롤해야 보이고 화면마다 자리가 달라진다.
 * 집중이 필요한 화면(판정 상세·시간축·판정 카드·저장 목록·출처)에서는 숨긴다.
 *
 * 아이콘: **비활성은 라인, 활성은 면으로 채운다.** 색만 바뀌는 것보다 지금 어느 화면인지가
 * 분명하고, 일반 서비스 앱에서 가장 흔한 방식이다(2026-09-15 사용자 확정, B안).
 * 라인은 굵기 1.7(활성 1.9)·둥근 끝으로 통일한다. 다섯 개가 한 세트로 보여야 한다.
 */
import type { JSX } from 'react';
import { t } from '@/i18n';

export type TabName = 'home' | 'convert' | 'broker' | 'report' | 'settings';

export const TABS: TabName[] = ['home', 'convert', 'broker', 'report', 'settings'];

export const isTabRoute = (name: string): name is TabName => (TABS as string[]).includes(name);

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** 채운 아이콘 안에 파내는 선. 알약 배경이 흰색이라 흰 선으로 판다 */
const carve = (w = 2) => ({
  fill: 'none',
  stroke: '#fff',
  strokeWidth: w,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** 비활성 — 라인 */
const LINE: Record<TabName, JSX.Element> = {
  // 둥근 사각 안의 체크 — 판정. 로고와 같은 뜻을 쓴다
  home: (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5.2" {...line} />
      <path d="M8.3 12.1l2.7 2.7 5-5.3" {...line} />
    </>
  ),
  // 서로 반대로 가는 화살표 — 전세↔월세 환산
  convert: (
    <>
      <path d="M4.8 9.3h11.4M13.4 6.5l2.8 2.8-2.8 2.8" {...line} />
      <path d="M19.2 14.7H7.8M10.6 11.9l-2.8 2.8 2.8 2.8" {...line} />
    </>
  ),
  // 영수증 — 중개보수. 도장은 22px 에서 뭉개졌다
  broker: (
    <>
      <path
        d="M5.6 4.6a1 1 0 0 1 1-1h10.8a1 1 0 0 1 1 1v15.8l-2.6-1.5-2.6 1.5-2.6-1.5-2.6 1.5-2.4-1.4z"
        {...line}
      />
      <path d="M9 8.6h6M9 12.4h4" {...line} />
    </>
  ),
  // 서류 + 체크 — 임대차 신고
  report: (
    <>
      <path d="M6.4 3.8h7.2l4 4V20a1 1 0 0 1-1 1H6.4a1 1 0 0 1-1-1V4.8a1 1 0 0 1 1-1z" {...line} />
      <path d="M13.4 3.9v3.9h3.9" {...line} />
      <path d="M8.8 14.4l2 2 3.6-3.8" {...line} />
    </>
  ),
  // 슬라이더 — 설정. 톱니바퀴는 22px 에서 햇살처럼 보인다(net-pay 에서 배운 것)
  settings: (
    <>
      <path d="M4.4 8.2h9.2M18.4 8.2h1.2M4.4 15.8h4.2M13.4 15.8h6.2" {...line} />
      <circle cx="16" cy="8.2" r="2.4" {...line} />
      <circle cx="11" cy="15.8" r="2.4" {...line} />
    </>
  ),
};

/** 활성 — 면 */
const FILL: Record<TabName, JSX.Element> = {
  home: (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5.2" fill="currentColor" />
      <path d="M8.3 12.1l2.7 2.7 5-5.3" {...carve(2.1)} />
    </>
  ),
  convert: (
    <>
      <path
        d="M4.8 8.2h9.6V5.6a1 1 0 0 1 1.7-.7l3.6 3.6a1 1 0 0 1 0 1.4l-3.6 3.6a1 1 0 0 1-1.7-.7V10.2H4.8a1 1 0 0 1 0-2z"
        fill="currentColor"
      />
      <path
        d="M19.2 15.8H9.6v2.6a1 1 0 0 1-1.7.7l-3.6-3.6a1 1 0 0 1 0-1.4l3.6-3.6a1 1 0 0 1 1.7.7v2.6h9.6a1 1 0 0 1 0 2z"
        fill="currentColor"
      />
    </>
  ),
  broker: (
    <>
      <path
        d="M5.6 4.6a1 1 0 0 1 1-1h10.8a1 1 0 0 1 1 1v15.8l-2.6-1.5-2.6 1.5-2.6-1.5-2.6 1.5-2.4-1.4z"
        fill="currentColor"
      />
      <path d="M9 8.6h6M9 12.4h4" {...carve(1.9)} />
    </>
  ),
  report: (
    <>
      <path
        d="M6.4 3.8h7.2l4.4 4.4V20a1 1 0 0 1-1 1H6.4a1 1 0 0 1-1-1V4.8a1 1 0 0 1 1-1z"
        fill="currentColor"
      />
      <path d="M8.8 14.4l2 2 3.6-3.8" {...carve(2)} />
    </>
  ),
  settings: (
    <>
      <path
        d="M4.4 7.2h9.2a1 1 0 0 1 0 2H4.4a1 1 0 0 1 0-2zM18.4 7.2h1.2a1 1 0 0 1 0 2h-1.2a1 1 0 0 1 0-2zM4.4 14.8h4.2a1 1 0 0 1 0 2H4.4a1 1 0 0 1 0-2zM13.4 14.8h6.2a1 1 0 0 1 0 2h-6.2a1 1 0 0 1 0-2z"
        fill="currentColor"
      />
      <circle cx="16" cy="8.2" r="2.8" fill="currentColor" />
      <circle cx="11" cy="15.8" r="2.8" fill="currentColor" />
    </>
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
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              {active ? FILL[tab] : LINE[tab]}
            </svg>
            <span>{t(`tab.${tab}` as 'tab.home')}</span>
          </button>
        );
      })}
    </nav>
  );
}
