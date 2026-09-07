/**
 * 인앱 광고 — docs/FUNCTIONAL_SPEC.md §3-8 (MZ-2, MZ-3)
 * 보상은 userEarnedReward 이벤트에서만 지급한다. dismissed 만으로는 지급 금지.
 */
import { TossAds, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

/** 개발·QR 테스트용 ID. 프로덕션 빌드 전 콘솔에서 발급한 실 ID로 교체한다. */
export const AD_GROUP = {
  rewarded: import.meta.env.VITE_AD_REWARDED_ID ?? 'ait-ad-test-rewarded-id',
  banner: import.meta.env.VITE_AD_BANNER_ID ?? 'ait-ad-test-banner-id',
} as const;

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
      options: { adGroupId: AD_GROUP.rewarded },
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
  /** 보상 지급 — 이 콜백에서만 플레이 횟수를 늘린다 */
  onReward: () => void;
  onClosed: () => void;
  onFailed: () => void;
}

export function showRewarded(h: ShowRewardedHandlers): () => void {
  if (!adsSupported()) {
    h.onFailed();
    return () => {};
  }
  let rewarded = false;
  try {
    return showFullScreenAd({
      options: { adGroupId: AD_GROUP.rewarded },
      onEvent: (e) => {
        switch (e.type) {
          case 'userEarnedReward':
            rewarded = true;
            h.onReward();
            break;
          case 'dismissed':
            // 보상 없이 닫힘 — 지급하지 않는다
            if (!rewarded) h.onClosed();
            else h.onClosed();
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

/* ── 배너 광고 (MZ-3) ────────────────────────────────────────── */

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
    const attached = TossAds.attachBanner(AD_GROUP.banner, el, {
      theme: 'light',
      variant: 'expanded',
    });
    return () => attached?.destroy();
  } catch {
    return () => {};
  }
}
