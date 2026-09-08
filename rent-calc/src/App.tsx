/**
 * 라우팅·상태 조립 — docs/FUNCTIONAL_SPEC.md §2
 *
 * v1.0 전 화면은 W2에서 붙인다. 지금은 S01(판정)만 있고,
 * 뒤로가기는 첫 화면이므로 미니앱을 종료한다.
 */
import { useEffect, useState } from 'react';
import { closeApp, onBack, useSafeArea } from '@ait/kit';
import { baserate } from '@/data';
import { latestRate } from '@/engine/baserate';
import { Home, type Draft } from '@/screens/Home';

const initialDraft: Draft = {
  mode: 'renew',
  current: { deposit: null, rent: null },
  proposed: { deposit: null, rent: null },
};

export function App() {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const { rate, asOf } = latestRate(baserate);
  useSafeArea();

  // 첫 화면에서 뒤로가기 = 미니앱 종료 (자체 헤더·뒤로가기 버튼은 두지 않는다)
  useEffect(() => onBack(() => void closeApp()), []);

  return <Home draft={draft} onDraft={setDraft} baseRate={rate} asOf={asOf} />;
}
