import { Component, HostListener, signal } from '@angular/core';
import { TutoresPageComponent } from './pages/tutores-page/tutores-page';
import { ButtonComponent } from './shared/components/atoms/button/button';

@Component({
  imports: [TutoresPageComponent, ButtonComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly sentryTestEnabled =
    new URLSearchParams(window.location.search).get('sentry-test') === '1' &&
    Boolean(window.__MYT_CONFIG__?.sentryDsn);
  public readonly sentryEventId = signal<string | undefined>(undefined);

  public throwTestError(): void {
    this.sentryEventId.set(undefined);
    throw new Error('Sentry Test Error');
  }

  @HostListener('window:sentry-event-sent', ['$event'])
  public handleSentryEventSent(event: Event): void {
    this.sentryEventId.set((event as CustomEvent<string>).detail);
  }
}
