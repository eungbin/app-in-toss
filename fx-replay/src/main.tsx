import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureAds } from '@ait/kit';
import { TDSMobileProvider } from '@toss/tds-mobile';
import { App } from './App';
import './styles.css';

// 광고 그룹 ID 주입 — 없으면 kit의 테스트 ID. 프로덕션 빌드 전 콘솔 발급 ID로 교체(.env).
configureAds({
  ...(import.meta.env.VITE_AD_REWARDED_ID ? { rewarded: import.meta.env.VITE_AD_REWARDED_ID } : {}),
  ...(import.meta.env.VITE_AD_BANNER_ID ? { banner: import.meta.env.VITE_AD_BANNER_ID } : {}),
});

/** TDS Provider 가 요구하는 실행 환경 정보 */
const ua = navigator.userAgent;
const userAgent = {
  fontA11y: undefined,
  fontScale: undefined,
  isAndroid: /android/i.test(ua),
  isIOS: /iphone|ipad|ipod/i.test(ua),
};

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      {/* TDS 컴포넌트는 Provider 안에서만 동작한다. resetGlobalCss 는 우리 styles.css 와 충돌하지 않게 끈다 */}
      <TDSMobileProvider userAgent={userAgent} resetGlobalCss={false}>
        <App />
      </TDSMobileProvider>
    </StrictMode>,
  );
}
