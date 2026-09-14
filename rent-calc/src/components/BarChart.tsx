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
/**
 * 라벨 하나가 차지하는 대략적인 너비(viewBox 단위).
 * font-size 9 에 5~6자("2021*", "3,020") 기준이다.
 * 막대가 많아 칸이 이보다 좁아지면 라벨을 건너뛴다 — fx-replay 가 실기기에서
 * 차트 x축 라벨이 겹치는 문제를 겪었다. 시간축은 매년 막대가 하나씩 늘어난다.
 */
const LABEL_W = 30;

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
  // 칸이 좁으면 n개마다 하나씩만 그린다. 첫 막대와 마지막 막대는 항상 그린다
  const step = Math.max(1, Math.ceil(LABEL_W / slot));
  const showLabel = (i: number) => step === 1 || i === 0 || i === bars.length - 1 || i % step === 0;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="연도별 월 실수령 막대 차트" className="chart__svg">
        {bars.map((b, i) => {
          const h = ((b.value - base) / span) * (H - PAD_TOP - PAD_BOTTOM);
          const x = i * slot + (slot - barW) / 2;
          const y = H - PAD_BOTTOM - h;
          return (
            <g key={b.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, h)}
                rx="3"
                className="chart__bar"
                // 연도 순서대로 조금씩 늦게 자란다. 마지막 막대까지 0.3초 안에 끝난다
                style={{ animationDelay: `${i * 40}ms` }}
              />
              {showLabel(i) && (
                <>
                  <text x={x + barW / 2} y={y - 6} className="chart__value">
                    {format(b.value)}
                  </text>
                  <text x={x + barW / 2} y={H - 8} className="chart__label">
                    {b.label}
                    {b.note ? '*' : ''}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      {/* 라벨을 건너뛰어도 값은 여기서 전부 읽을 수 있다 */}
      <figcaption className="chart__alt">
        {bars.map((b) => `${b.label} ${format(b.value)}`).join(' · ')}
      </figcaption>
    </figure>
  );
}
