/**
 * 아이콘 — 전부 인라인 SVG. 이모지·글리프(› ✕ ▾)는 쓰지 않는다.
 * 기기·폰트마다 크기와 굵기가 달라지고 색이 상속되지 않는다(net-pay 6-3).
 */
type Name =
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'gear'
  | 'calendar'
  | 'list'
  | 'wallet'
  | 'plus'
  | 'check'
  | 'lock'
  | 'share';

const PATHS: Record<Name, { d: string; extra?: string; circles?: [number, number, number][] }> = {
  chevronLeft: { d: 'M14.5 6L9 12l5.5 6' },
  chevronRight: { d: 'M9.5 6L15 12l-5.5 6' },
  chevronDown: { d: 'M6 9.5l6 5.5 6-5.5' },
  // 톱니를 그리면 크기가 작을 때 해(sun)처럼 읽힌다. 슬라이더 세 줄로 그린다
  gear: {
    d: 'M4 7h4M12 7h8M4 12h9M17 12h3M4 17h6M14 17h6',
    circles: [
      [10, 7, 2],
      [15, 12, 2],
      [12, 17, 2],
    ],
  },
  calendar: { d: 'M4 8.5h16M8 3v3M16 3v3', extra: 'M5 5.5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1z' },
  list: { d: 'M5 7.5h14M5 12h14M5 16.5h9' },
  wallet: { d: 'M4 7.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z', circles: [[12, 13, 2.4]] },
  plus: { d: 'M12 5v14M5 12h14' },
  check: { d: 'M5.5 12.5l4 4L18.5 7.5' },
  lock: { d: 'M8 10.5V8a4 4 0 0 1 8 0v2.5', extra: 'M5.5 10.5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z' },
  share: { d: 'M15.5 4l4 4-4 4M19.5 8H10a5 5 0 0 0-5 5v3' },
};

interface Props {
  name: Name;
  size?: number;
  /** 선 굵기. 작은 크기에서는 굵게 그려야 흐려지지 않는다 */
  width?: number;
}

export function Icon({ name, size = 20, width = 1.9 }: Props) {
  const p = PATHS[name];
  return (
    <svg className="icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {p.extra ? (
        <path d={p.extra} fill="none" stroke="currentColor" strokeWidth={width} strokeLinejoin="round" />
      ) : null}
      <path d={p.d} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      {(p.circles ?? []).map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={width} />
      ))}
    </svg>
  );
}
