import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 콘솔에 등록된 앱 식별자와 정확히 같아야 한다. 업로드 경로가 bundles/<appName>/ 이라
  // 한 글자라도 다르면 기존 앱(miniAppId 55107)이 아니라 다른 앱을 찾는다.
  appName: 'photo-standard',
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
  // 사진을 읽고(앨범 선택) 쓰는(결과 저장) 권한, 그리고 촬영 권한.
  // 실제 요청은 사용자가 그 버튼을 누른 시점에만 한다 — docs/PRD.md 2-1 A5.
  permissions: [
    { name: 'photos', access: 'read' },
    { name: 'photos', access: 'write' },
    { name: 'camera', access: 'access' },
  ],
  webBundleDir: 'dist',
});
