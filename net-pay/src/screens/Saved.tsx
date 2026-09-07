/** 저장한 계산 — docs/SCREEN_FLOW.md S08 */
import { useState } from 'react';
import type { Scenario } from '@/types';
import { SAVED_CAP, SAVED_FREE } from '@/constants';
import { manwon, num } from '@/engine/format';
import { BasisFooter } from '@/components/BasisFooter';
import { BannerAd } from '@/components/BannerAd';
import { t } from '@/i18n';

interface Props {
  scenarios: Scenario[];
  unlocked: boolean;
  onOpen: (s: Scenario) => void;
  onDelete: (s: Scenario) => void;
  onCompare: (a: Scenario, b: Scenario) => void;
}

function summarize(s: Scenario): string {
  if (s.input.mode === 'reverse') {
    return `세후 월 ${manwon(s.input.targetNet ?? 0)}만 원 목표`;
  }
  return `연봉 ${manwon(s.input.annualGross ?? 0)}만 원`;
}

export function Saved({ scenarios, unlocked, onOpen, onDelete, onCompare }: Props) {
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));

  const compare = () => {
    const [a, b] = picked.map((id) => scenarios.find((s) => s.id === id));
    if (a && b) onCompare(a, b);
  };

  return (
    <main className="screen">
      <p className="summary">
        {unlocked ? t('saved.status.unlocked', { cap: SAVED_CAP }) : t('saved.status.free', { n: SAVED_FREE, cap: SAVED_CAP })}
      </p>

      {scenarios.length === 0 ? (
        <p className="hint">{t('saved.empty')}</p>
      ) : (
        <ul className="list">
          {scenarios.map((s) => (
            <li key={s.id} className="list__item">
              <label className="list__pick">
                <input type="checkbox" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} />
              </label>
              <button type="button" className="list__body" onClick={() => onOpen(s)}>
                <span className="list__name">
                  {s.name} · {s.input.mode === 'reverse' ? '역산' : '연봉'}
                </span>
                <span className="list__sub">{summarize(s)}</span>
                <span className="list__sub">
                  가족 {s.input.dependents} · 자녀 {s.input.children} · {s.createdAt.slice(0, 10)}
                </span>
              </button>
              <button type="button" className="list__del" aria-label={`${s.name} 삭제`} onClick={() => onDelete(s)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {scenarios.length >= 2 && (
        <button type="button" className="cta" disabled={picked.length !== 2} onClick={compare}>
          {t('saved.compare')} {picked.length === 2 ? '' : `(2개 선택, ${picked.length}개)`}
        </button>
      )}
      <p className="hint">{num(scenarios.length)}개 저장됨</p>
      <BasisFooter withYearEnd={false} />
      <BannerAd />
    </main>
  );
}
