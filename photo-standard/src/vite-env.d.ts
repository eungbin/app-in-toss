/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AD_REWARDED_ID?: string;
  readonly VITE_AD_BANNER_ID?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
