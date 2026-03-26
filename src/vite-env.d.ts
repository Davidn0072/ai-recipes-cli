/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set in `frontend/.env`, e.g. `VITE_API_URL=http://localhost:3000` */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
