import { useEffect } from 'react';
import { closeApp, onBack, pushBackHandler, runBackHandlers } from '@ait/kit';
import { Home } from '@/screens/Home';

export function App() {
  useEffect(() => onBack(runBackHandlers), []);
  // 첫 화면에서 뒤로가기 = 미니앱 종료 (비게임 체크리스트)
  useEffect(
    () =>
      pushBackHandler(() => {
        void closeApp();
        return true;
      }),
    [],
  );
  return <Home />;
}
