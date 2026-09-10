/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AD_REWARDED_ID?: string;
  readonly VITE_AD_BANNER_ID?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  /** 진단 빌드 플래그 — 출시 빌드에서는 반드시 비어 있어야 한다(check:config) */
  readonly VITE_DIAG?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
