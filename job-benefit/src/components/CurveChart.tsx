/**
 * 재취업 시점별 총 수령액 곡선 — docs/SCREEN_FLOW.md S03
 * 이 그림의 전부는 **1/2 지점의 계단**이다. 그 지점을 넘기면 조기재취업수당이 사라진다.
 */
import type { CurvePoint } from '@/types';

interface Props {
  points: CurvePoint[];
  /** 계단이 생기는 날 */
  cliffDay: number;
}

const W = 303;
const H = 176;
const PAD_TOP = 12;
const BASE = 150;

export function CurveChart({ points, cliffDay }: Props) {
  if (points.length < 2) return null;
  const maxTotal = Math.max(...points.map((p) => p.total), 1);
  const lastDay = points[points.length - 1]?.day ?? 1;
  const x = (day: number): number => (day / lastDay) * W;
  const y = (total: number): number => PAD_TOP + (1 - total / maxTotal) * (BASE - PAD_TOP);

  // 계단 앞뒤를 끊어 두 구간으로 그린다. 한 path 로 이으면 수직선이 값처럼 보인다
  const before = points.filter((p) => p.day <= cliffDay);
  const after = points.filter((p) => p.day > cliffDay);
  const path = (ps: CurvePoint[]): string =>
    ps.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.day).toFixed(1)} ${y(p.total).toFixed(1)}`).join(' ');

  const peak = points[cliffDay];
  const drop = after[0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} fill="none" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <line x1="0" y1={BASE} x2={W} y2={BASE} stroke="var(--line)" strokeWidth="1" />
      <path d={path(before)} stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d={path(after)} stroke="var(--gray-400)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {peak && drop ? (
        <>
          <line x1={x(cliffDay)} y1={PAD_TOP - 4} x2={x(cliffDay)} y2={BASE} stroke="var(--gray-300)" strokeWidth="1" strokeDasharray="3 4" />
          <circle cx={x(peak.day)} cy={y(peak.total)} r="4.5" fill="var(--primary)" />
          <circle cx={x(drop.day)} cy={y(drop.total)} r="4.5" fill="var(--card)" stroke="var(--gray-500)" strokeWidth="2" />
        </>
      ) : null}
    </svg>
  );
}
