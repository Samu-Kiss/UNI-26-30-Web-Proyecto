import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Cargar variables de entorno desde archivos .env / .env.local si no están ya en process.env
const candidateEnvPaths = [
  resolve('../.env.local'),
  resolve('../.env'),
  resolve('.env.local'),
  resolve('.env'),
];

for (const envPath of candidateEnvPaths) {
  if (!existsSync(envPath)) continue;
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    // Si no se puede leer un archivo opcional, continuar silenciosamente
  }
}

const tracesSampleRate = Number.parseFloat(
  process.env.SENTRY_FRONTEND_TRACES_SAMPLE_RATE ?? process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'
);

const dbUsername =
  process.env.SUPABASE_DEV_DB_USERNAME ??
  process.env.SUPABASE_PROD_DB_USERNAME ??
  process.env.DB_USERNAME ??
  '';
const derivedProjectRef = dbUsername.startsWith('postgres.')
  ? dbUsername.slice('postgres.'.length).trim()
  : '';
const defaultSupabaseUrl = derivedProjectRef ? `https://${derivedProjectRef}.supabase.co` : '';

const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);
const defaultBackendUrl = isVercel ? '' : 'http://localhost:8080';
const resolvedBackendUrl =
  isVercel && process.env.MYT_USE_DIRECT_BACKEND !== 'true'
    ? ''
    : (process.env.MYT_BACKEND_URL ?? defaultBackendUrl);

const config = {
  backendUrl: resolvedBackendUrl.replace(/\/+$/, ''),
  supabaseUrl: (process.env.SUPABASE_URL || defaultSupabaseUrl).replace(/\/+$/, ''),
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  sentryDsn: process.env.SENTRY_FRONTEND_DSN ?? process.env.SENTRY_DSN ?? '',
  environment:
    process.env.SENTRY_FRONTEND_ENVIRONMENT ??
    process.env.SENTRY_ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    'local',
  release: process.env.SENTRY_FRONTEND_RELEASE ?? process.env.SENTRY_RELEASE ?? 'myt-frontend@dev',
  tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
};

const contents = `window.__MYT_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`;
await writeFile(resolve('public/runtime-config.js'), contents, 'utf8');
