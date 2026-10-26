import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { mensajeHttp } from './core/services/api.service';
import { ButtonComponent } from './shared/components/atoms/button/button';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly errorSesion = signal('');
  cerrarSesion() {
    this.auth.cerrar().subscribe({
      next: () => {
        this.errorSesion.set('');
        void this.router.navigateByUrl('/login');
      },
      error: (e) => this.errorSesion.set(mensajeHttp(e)),
    });
  }
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
