import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'rent-calc',
  brand: { primaryColor: '#3182F6' },
  // 토스가 그리는 네비게이션 바를 사용한다. 미니앱은 자체 헤더·뒤로가기 버튼을 두지 않는다.
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
    withTitle: true,
    theme: 'light',
  },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
    overScrollMode: 'never',
  },
  permissions: [],
  webBundleDir: 'dist',
});
