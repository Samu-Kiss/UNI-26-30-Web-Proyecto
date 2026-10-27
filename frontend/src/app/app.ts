import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { mensajeHttp } from './core/services/api.service';
import { ButtonComponent } from './shared/components/atoms/button/button';
import { LucideIconComponent } from './shared/components/atoms/lucide-icon/lucide-icon';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonComponent, LucideIconComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly errorSesion = signal('');
  readonly esLanding = signal(false);

  constructor() {
    this.actualizarEsLanding(this.router.url);
    this.router.events
      .pipe(
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((ev) => this.actualizarEsLanding(ev.urlAfterRedirects));
  }

  private actualizarEsLanding(url: string): void {
    const clean = url.split('?')[0].split('#')[0];
    this.esLanding.set(
      clean === '' || clean === '/' || clean === '/landing' || clean === '/login',
    );
  }

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
