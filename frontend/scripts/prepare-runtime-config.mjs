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

const config = {
  sentryDsn: process.env.SENTRY_FRONTEND_DSN ?? process.env.SENTRY_DSN ?? '',
  environment: process.env.SENTRY_FRONTEND_ENVIRONMENT ?? process.env.SENTRY_ENVIRONMENT ?? 'local',
  release: process.env.SENTRY_FRONTEND_RELEASE ?? process.env.SENTRY_RELEASE ?? 'myt-frontend@dev',
  tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
};

const contents = `window.__MYT_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`;
await writeFile(resolve('public/runtime-config.js'), contents, 'utf8');
