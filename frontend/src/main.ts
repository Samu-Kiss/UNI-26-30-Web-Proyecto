import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const runtimeConfig = window.__MYT_CONFIG__;

if (runtimeConfig?.sentryDsn) {
  const sentryClient = Sentry.init({
    dsn: runtimeConfig.sentryDsn,
    environment: runtimeConfig.environment || 'local',
    release: runtimeConfig.release || 'myt-frontend@dev',
    integrations: [Sentry.browserTracingIntegration()],
    sendDefaultPii: false,
    tracesSampleRate: runtimeConfig.tracesSampleRate ?? 0,
  });

  sentryClient?.on('afterSendEvent', (event) => {
    if (!event.type && event.event_id) {
      window.dispatchEvent(new CustomEvent('sentry-event-sent', { detail: event.event_id }));
    }
  });
}

bootstrapApplication(App, appConfig).catch((error: unknown) => {
  console.error(error);
});
