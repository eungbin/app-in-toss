/**
 * 배너 광고 슬롯 — docs/FUNCTIONAL_SPEC.md §3-8 (MZ-3)
 * 스크롤 가능한 화면(홈·내 기록)의 컨텐츠 마지막에만 둔다.
 * 프리미엄 사용자와 미지원 환경에서는 아무것도 렌더하지 않는다.
 */
import { useEffect, useRef, useState } from 'react';
import { attachBanner, bannerSupported, initBannerSdk } from '@/platform/ads';

export function BannerAd({ hidden = false }: { hidden?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hidden) return;
    initBannerSdk(setReady);
  }, [hidden]);

  useEffect(() => {
    if (hidden || !ready || !ref.current) return undefined;
    return attachBanner(ref.current);
  }, [hidden, ready]);

  if (hidden || !bannerSupported()) return null;
  return <div className="banner-slot" ref={ref} />;
}
