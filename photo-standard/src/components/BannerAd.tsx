/**
 * 배너 광고 슬롯 — docs/FUNCTIONAL_SPEC.md §3-10
 * 항상 스크롤 콘텐츠의 마지막 요소다. 키패드 위·고정 하단에 두지 않는다.
 */
import { useEffect, useRef, useState } from 'react';
import { attachBanner, bannerSupported, getAdGroups } from '@ait/kit';

export function BannerAd() {
  const ref = useRef<HTMLDivElement>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !bannerSupported() || getAdGroups().banner.trim() === '') return;
    let detach: (() => void) | undefined;
    try {
      detach = attachBanner(el);
    } catch {
      return;
    }
    // SDK 가 자리를 채웠는지 확인한다. 못 채우면 슬롯을 접는다.
    const id = setTimeout(() => setOk(el.childElementCount > 0), 400);
    return () => {
      clearTimeout(id);
      detach?.();
    };
  }, []);

  // 광고를 붙이지 못하면 자리를 차지하지 않는다
  return <div ref={ref} className="banner" style={ok ? undefined : { display: 'none' }} />;
}
