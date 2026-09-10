/**
 * 앱 셸. 화면 구현은 `/design` 시안 승인 뒤에 한다(PLAYBOOK 2-10).
 * 지금은 라우팅 골격과 엔진 연결만 확인한다.
 */
import { useState } from 'react';
import { t } from './i18n';

export function App(): JSX.Element {
  const [route] = useState<'home'>('home');
  return (
    <main className="app">
      <h1>{t('app.title')}</h1>
      <p>{t('app.subtitle')}</p>
      {route === 'home' ? null : null}
    </main>
  );
}
