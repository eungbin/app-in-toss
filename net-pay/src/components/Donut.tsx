/**
 * 세전 월급 구성 도넛 — docs/SCREEN_FLOW.md S02
 *
 * 결과 화면에서 숫자보다 먼저 읽히는 그림이다. 세전 월급이 실수령과 공제로
 * 어떻게 갈라지는지 보여 준다.
 *
 * 색은 실수령만 파랑이고 공제는 회색 계단이다. 공제는 빠져나가는 몫이라
 * 회색이 맞고, 항목마다 다른 색을 주면 증감·성과를 강조하는 것처럼 읽힌다
 * (6장: 증감에 색 의미를 두지 않는다).
 */
import type { Breakdown } from '@/types';
import { num, pct } from '@/engine/format';
import { t } from '@/i18n';

const R = 54;
const CIRC = 2 * Math.PI * R;

export interface Slice {
  key: string;
  label: string;
  color: string;
  amount: number;
}

/** 도넛과 범례가 같은 순서·같은 색을 쓰도록 한곳에서 만든다 */
export function buildSlices(b: Breakdown): Slice[] {
  return [
    { key: 'net', label: t('result.slice.net'), color: 'var(--primary)', amount: b.netMonthly },
    { key: 'nps', label: t('result.slice.nps'), color: 'var(--gray-600)', amount: b.nps },
    { key: 'nhis', label: t('result.slice.nhis'), color: 'var(--gray-500)', amount: b.nhis + b.ltc },
    { key: 'tax', label: t('result.slice.tax'), color: 'var(--gray-400)', amount: b.incomeTax + b.localTax },
    { key: 'ei', label: t('result.slice.ei'), color: 'var(--gray-300)', amount: b.ei },
  ];
}

export function Donut({ slices, total, netRatio }: { slices: Slice[]; total: number; netRatio: number }) {
  let offset = 0;
  return (
    <svg
      viewBox="0 0 140 140"
      className="donut"
      role="img"
      aria-label={t('result.donut.alt', {
        p: pct(netRatio, 1),
        items: slices.map((s) => `${s.label} ${num(s.amount)}원`).join(', '),
      })}
    >
      <g transform="rotate(-90 70 70)" fill="none" strokeWidth="16">
        {slices.map((s) => {
          const len = total > 0 ? (s.amount / total) * CIRC : 0;
          const dash = `${len.toFixed(2)} ${CIRC.toFixed(2)}`;
          const el = (
            <circle
              key={s.key}
              cx="70"
              cy="70"
              r={R}
              stroke={s.color}
              strokeDasharray={dash}
              strokeDashoffset={(-offset).toFixed(2)}
            />
          );
          offset += len;
          return el;
        })}
      </g>
      <text x="70" y="65" className="donut__label">
        {t('result.slice.net')}
      </text>
      <text x="70" y="86" className="donut__value">
        {pct(netRatio, 1)}
      </text>
    </svg>
  );
}

/**
 * 가로 스택 바 — 공제 상세 화면 머리.
 * 표를 읽기 전에 비율이 먼저 보이게 한다.
 */
export function StackedBar({ slices, total }: { slices: Slice[]; total: number }) {
  return (
    <div className="stack" aria-hidden="true">
      {slices.map((s) => (
        <div
          key={s.key}
          className="stack__seg"
          style={{ flexGrow: total > 0 ? s.amount / total : 0, background: s.color }}
        />
      ))}
    </div>
  );
}
