/**
 * 연도별 막대 차트 — docs/SCREEN_FLOW.md S04 (UI-4)
 * 단일색을 쓴다. 증감에 색 의미를 주지 않는다(성과 강조 회피).
 * 차트 옆에 텍스트 대체를 함께 둔다(접근성).
 */
interface Bar {
  label: string;
  value: number;
  /** 라벨 아래 각주 표시(예: 세액표 폴백) */
  note?: boolean;
}

const W = 320;
const H = 160;
const PAD_TOP = 22;
const PAD_BOTTOM = 24;

export function BarChart({ bars, format }: { bars: Bar[]; format: (v: number) => string }) {
  if (bars.length === 0) return null;
  const values = bars.map((b) => b.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  // 차이를 보이게 하려고 밑을 0이 아니라 최소값의 90%에서 시작한다
  const base = Math.max(0, min - (max - min) * 1.2 - 1);
  const span = Math.max(1, max - base);
  const slot = W / bars.length;
  const barW = Math.min(34, slot * 0.55);

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="연도별 월 실수령 막대 차트" className="chart__svg">
        {bars.map((b, i) => {
          const h = ((b.value - base) / span) * (H - PAD_TOP - PAD_BOTTOM);
          const x = i * slot + (slot - barW) / 2;
          const y = H - PAD_BOTTOM - h;
          return (
            <g key={b.label}>
              <rect x={x} y={y} width={barW} height={Math.max(2, h)} rx="3" className="chart__bar" />
              <text x={x + barW / 2} y={y - 6} className="chart__value">
                {format(b.value)}
              </text>
              <text x={x + barW / 2} y={H - 8} className="chart__label">
                {b.label}
                {b.note ? '*' : ''}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="chart__alt">
        {bars.map((b) => `${b.label} ${format(b.value)}`).join(' · ')}
      </figcaption>
    </figure>
  );
}
