/**
 * 아이콘 — 인라인 SVG 만 쓴다.
 * 이모지·글리프(› ✕ ▾ −)는 기기·폰트마다 다르게 그려진다(docs/SCREEN_FLOW.md 6-3).
 */
interface Props {
  size?: number;
  color?: string;
}

const S = (p: Props) => ({
  width: p.size ?? 20,
  height: p.size ?? 20,
  stroke: p.color ?? 'currentColor',
  'aria-hidden': true as const,
});

export function IconImage(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 24 24" {...rest} fill="none">
      <path d="M4 6.6h16a1 1 0 0 1 1 1v9.8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.6a1 1 0 0 1 1-1z" stroke={stroke} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M3 15l5-4 4.5 4M14 13.5l3-2.5 4 3.5" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCamera(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 24 24" {...rest} fill="none">
      <path d="M3.8 7.8h3.4l1.6-2.2h6.4l1.6 2.2h3.4a1 1 0 0 1 1 1v9.4a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1V8.8a1 1 0 0 1 1-1z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="13.4" r="3.5" stroke={stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function IconCheck(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 20 20" {...rest} fill="none">
      <circle cx="10" cy="10" r="8.2" stroke={stroke} strokeWidth="1.8" />
      <path d="M6.3 10.2l2.6 2.6 4.8-5.2" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconWarn(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 20 20" {...rest} fill="none">
      <circle cx="10" cy="10" r="8.2" stroke={stroke} strokeWidth="1.8" />
      <path d="M10 5.8v5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="13.8" r="1.05" fill={stroke} stroke="none" />
    </svg>
  );
}

export function IconBlocked(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 20 20" {...rest} fill="none">
      <circle cx="10" cy="10" r="8.2" stroke={stroke} strokeWidth="1.9" />
      <path d="M6.8 6.8l6.4 6.4M13.2 6.8l-6.4 6.4" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function IconArrow(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 16 16" {...rest} fill="none">
      <path d="M2.6 8h9.4M8.8 4.8L12 8l-3.2 3.2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevron(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 16 16" {...rest} fill="none">
      <path d="M6 3.5L10.5 8L6 12.5" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconExternal(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 16 16" {...rest} fill="none">
      <path d="M6.4 3.2h6.4v6.4M12.4 3.6L7 9" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.4 10.2v2.2a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1V5.8a1 1 0 0 1 1-1H6" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconShield(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 20 20" {...rest} fill="none">
      <path d="M10 2.5l6 2.2v4.6c0 3.5-2.4 6.6-6 7.7-3.6-1.1-6-4.2-6-7.7V4.7z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.4 10.1l1.9 1.9 3.4-3.6" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDownload(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 24 24" {...rest} fill="none">
      <path d="M12 4v10.4M7.8 10.6L12 14.8l4.2-4.2" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 17.4v1.6a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-1.6" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlay(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 24 24" {...rest} fill="none">
      <path d="M4.5 6.6h15a1 1 0 0 1 1 1v8.8a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V7.6a1 1 0 0 1 1-1z" stroke={stroke} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M10.4 9.6l4.4 2.4-4.4 2.4z" fill={stroke} stroke="none" />
    </svg>
  );
}

export function IconCrop(p: Props) {
  const { stroke, ...rest } = S(p);
  return (
    <svg viewBox="0 0 20 20" {...rest} fill="none">
      <rect x="3.2" y="3.2" width="13.6" height="13.6" rx="2.2" stroke={stroke} strokeWidth="1.6" />
      <path d="M7.6 10h4.8M10 7.6v4.8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
