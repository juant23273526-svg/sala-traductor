/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base (http/https) del Worker de Cloudflare que hospeda el Durable Object de la sala. */
  readonly VITE_WS_WORKER_URL?: string;
  /** URL del motor de traduccion (STT + traduccion + TTS en una sola llamada). */
  readonly VITE_API_TRANSLATE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
