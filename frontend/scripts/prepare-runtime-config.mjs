import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const tracesSampleRate = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0');
const config = {
  sentryDsn: process.env.SENTRY_DSN ?? '',
  environment: process.env.SENTRY_ENVIRONMENT ?? 'local',
  release: process.env.SENTRY_RELEASE ?? 'myt-frontend@dev',
  tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
};

const contents = `window.__MYT_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`;
await writeFile(resolve('public/runtime-config.js'), contents, 'utf8');
