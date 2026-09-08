/**
 * 인라인 SVG 아이콘.
 *
 * 이모지(🔒)나 문자 글리프(› ✕ ▾ −)를 아이콘으로 쓰면 기기·폰트마다 크기와 굵기가
 * 달라지고 세로 정렬이 어긋난다. 색도 상속되지 않는다. 여기 있는 것만 쓴다.
 * currentColor 를 쓰므로 부모의 color 를 따라간다.
 */

const PATHS = {
  chevronRight: 'M7.5 3.5 14 10l-6.5 6.5',
  chevronDown: 'M3.5 7.5 10 14l6.5-6.5',
  chevronUp: 'M3.5 12.5 10 6l6.5 6.5',
  close: 'M4.5 4.5l11 11M15.5 4.5l-11 11',
  minus: 'M4.5 10h11',
  plus: 'M10 4.5v11M4.5 10h11',
} as const;

export type IconName = keyof typeof PATHS | 'lock';

interface Props {
  name: IconName;
  /** 글자 크기 배수. 기본 1em — 부모 font-size 를 따라간다 */
  size?: number | string;
  className?: string;
}

export function Icon({ name, size = '1em', className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    'aria-hidden': true,
    focusable: false,
    className: className ? `icon ${className}` : 'icon',
  } as const;

  // 자물쇠만 채움 도형이다
  if (name === 'lock') {
    return (
      <svg {...common}>
        <path
          d="M6.25 8.5V6.75a3.75 3.75 0 0 1 7.5 0V8.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <rect x="4" y="8.5" width="12" height="8.5" rx="2.5" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d={PATHS[name]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
