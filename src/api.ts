/**
 * Backend base URL from `frontend/.env` (`VITE_API_URL`). Vite only exposes `VITE_*` vars.
 * Restart the dev server after changing `.env`.
 */
function apiBaseFromEnv(): string {
  const v = import.meta.env.VITE_API_URL;
  if (typeof v === 'string' && v.trim() !== '') {
    return v.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

export const API_BASE = apiBaseFromEnv();
