/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_URL: string
  readonly VITE_API_URL_NEW: string
  readonly VITE_BASE_URL?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_APP_ENV: string
  readonly VITE_THREE_API_URL?: string
  readonly VITE_TAL_URL?: string
  readonly VITE_CDN_URL?: string
  readonly VITE_WSS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
