import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureAds } from '@ait/kit';
import { App } from './App';
import './styles.css';

// 광고 그룹 ID 주입. .env 가 비면 광고를 붙이지 않는다 —
// 테스트 ID를 상수로 두면 출시 번들에 문자열이 남아 심사에서 반려된다.
configureAds({
  ...(import.meta.env.VITE_AD_REWARDED_ID ? { rewarded: import.meta.env.VITE_AD_REWARDED_ID } : {}),
  ...(import.meta.env.VITE_AD_BANNER_ID ? { banner: import.meta.env.VITE_AD_BANNER_ID } : {}),
});

const el = document.getElementById('root');
if (el) createRoot(el).render(<StrictMode><App /></StrictMode>);
