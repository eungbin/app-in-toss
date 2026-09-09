import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 콘솔에 등록된 앱 식별자와 정확히 같아야 한다. 업로드 경로가 bundles/<appName>/ 이라
  // 한 글자라도 다르면 기존 앱(miniAppId 55295)이 아니라 다른 앱을 찾는다.
  appName: 'work-journal',
  brand: { primaryColor: '#6B5CE7' },
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
  // 기기 권한을 요청하지 않는다. CSV 내보내기는 SDK File.saveBase64 를 거친다.
  permissions: [],
  webBundleDir: 'dist',
});
