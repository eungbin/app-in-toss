import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureAds } from '@ait/kit';
import { App } from './App';
import './styles.css';

// 광고 그룹 ID 주입 — 없으면 kit의 테스트 ID. 프로덕션 빌드 전 콘솔 발급 ID로 교체(.env).
configureAds({
  ...(import.meta.env.VITE_AD_REWARDED_ID ? { rewarded: import.meta.env.VITE_AD_REWARDED_ID } : {}),
  ...(import.meta.env.VITE_AD_BANNER_ID ? { banner: import.meta.env.VITE_AD_BANNER_ID } : {}),
});

const el = document.getElementById('root');
if (el) createRoot(el).render(<StrictMode><App /></StrictMode>);
