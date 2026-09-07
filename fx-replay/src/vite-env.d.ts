/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AD_REWARDED_ID?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
