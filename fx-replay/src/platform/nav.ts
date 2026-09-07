/**
 * 네비게이션 — docs/FUNCTIONAL_SPEC.md §4-6
 * 토스 네비게이션 바가 뒤로가기·홈·닫기를 그린다. 미니앱은 자체 뒤로가기 버튼을 두지 않고,
 * backEvent를 가로채 내부 라우팅을 처리한다. 첫 화면에서는 미니앱을 종료한다.
 */
import { Screen, graniteEvent } from '@apps-in-toss/web-framework';

/** 시스템·네비게이션 바 뒤로가기 구독. 해제 함수를 반환한다. */
export function onBack(handler: () => void): () => void {
  try {
    return graniteEvent.addEventListener('backEvent', {
      onEvent: handler,
      onError: () => {},
    });
  } catch {
    return () => {};
  }
}

/** 홈 버튼 구독 */
export function onHome(handler: () => void): () => void {
  try {
    return graniteEvent.addEventListener('homeEvent', {
      onEvent: handler,
      onError: () => {},
    });
  } catch {
    return () => {};
  }
}

/** 미니앱 종료 */
export async function closeApp(): Promise<void> {
  try {
    await Screen.close();
  } catch {
    // 토스 앱 밖(브라우저 개발)에서는 아무 것도 하지 않는다
  }
}
