/**
 * 인앱 광고 — 토스 애즈 SSP.
 * 보상은 userEarnedReward 이벤트에서만 지급한다. dismissed 만으로는 지급 금지.
 * 광고 그룹 ID는 앱 시작 시 `configureAds()`로 주입한다. 기본값은 테스트 ID.
 */
import { TossAds, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

export interface AdGroups {
  rewarded: string;
  banner: string;
}

/** 개발·QR 테스트용 ID. 프로덕션 빌드 전 콘솔에서 발급한 실 ID로 교체한다. */
export const TEST_AD_GROUPS: AdGroups = {
  rewarded: 'ait-ad-test-rewarded-id',
  banner: 'ait-ad-test-banner-id',
};

let groups: AdGroups = { ...TEST_AD_GROUPS };

export function configureAds(g: Partial<AdGroups>): void {
  groups = { ...groups, ...g };
}

export function getAdGroups(): Readonly<AdGroups> {
  return groups;
}

export type RewardedState = 'idle' | 'loading' | 'loaded' | 'showing' | 'failed';

export function adsSupported(): boolean {
  try {
    return loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  } catch {
    return false;
  }
}

/** 광고 프리로드. cleanup 함수를 반환한다. */
export function preloadRewarded(onState: (s: RewardedState) => void): () => void {
  if (!adsSupported()) {
    onState('failed');
    return () => {};
  }
  onState('loading');
  try {
    return loadFullScreenAd({
      options: { adGroupId: groups.rewarded },
      onEvent: (e) => {
        if (e.type === 'loaded') onState('loaded');
      },
      onError: () => onState('failed'),
    });
  } catch {
    onState('failed');
    return () => {};
  }
}

export interface ShowRewardedHandlers {
  /** 보상 지급 — 이 콜백에서만 보상을 준다 */
  onReward: () => void;
  onClosed: () => void;
  onFailed: () => void;
}

export function showRewarded(h: ShowRewardedHandlers): () => void {
  if (!adsSupported()) {
    h.onFailed();
    return () => {};
  }
  try {
    return showFullScreenAd({
      options: { adGroupId: groups.rewarded },
      onEvent: (e) => {
        switch (e.type) {
          case 'userEarnedReward':
            h.onReward();
            break;
          case 'dismissed':
            // 보상 없이 닫혀도 지급하지 않는다
            h.onClosed();
            break;
          case 'failedToShow':
            h.onFailed();
            break;
          default:
            break;
        }
      },
      onError: () => h.onFailed(),
    });
  } catch {
    h.onFailed();
    return () => {};
  }
}

/* ── 배너 광고 ────────────────────────────────────────────── */

let initialized = false;

export function bannerSupported(): boolean {
  try {
    return TossAds.initialize.isSupported() && TossAds.attachBanner.isSupported();
  } catch {
    return false;
  }
}

/** SDK 초기화 — 앱 시작 시 한 번만 호출한다. */
export function initBannerSdk(onReady: (ok: boolean) => void): void {
  if (initialized) {
    onReady(true);
    return;
  }
  if (!bannerSupported()) {
    onReady(false);
    return;
  }
  initialized = true;
  try {
    TossAds.initialize({
      callbacks: {
        onInitialized: () => onReady(true),
        onInitializationFailed: () => onReady(false),
      },
    });
  } catch {
    onReady(false);
  }
}

/** 배너를 DOM 요소에 붙인다. 언마운트 시 반환된 함수를 호출해야 한다. */
export function attachBanner(el: HTMLElement): () => void {
  if (!bannerSupported()) return () => {};
  try {
    const attached = TossAds.attachBanner(groups.banner, el, {
      theme: 'light',
      variant: 'expanded',
    });
    return () => attached?.destroy();
  } catch {
    return () => {};
  }
}
