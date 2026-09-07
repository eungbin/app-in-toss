/**
 * 배너 광고 슬롯 — docs/FUNCTIONAL_SPEC.md §3-9 (MZ-3)
 * 스크롤 가능한 화면의 콘텐츠 마지막에만 둔다. 입력 폼 위·바텀시트·로딩 화면에는 두지 않는다.
 */
import { useEffect, useRef, useState } from 'react';
import { attachBanner, bannerSupported, initBannerSdk } from '@ait/kit';

export function BannerAd() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => initBannerSdk(setReady), []);
  useEffect(() => {
    if (!ready || !ref.current) return undefined;
    return attachBanner(ref.current);
  }, [ready]);

  if (!bannerSupported()) return null;
  return <div className="banner-slot" ref={ref} />;
}
