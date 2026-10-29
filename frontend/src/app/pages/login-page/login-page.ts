import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Credenciales } from '../../core/models/usuario.model';
import { AuthService, EstadoSesion } from '../../core/services/auth.service';
import { ApiService, mensajeHttp } from '../../core/services/api.service';
import { LoginFormComponent } from '../../shared/components/organisms/login-form/login-form';
import { BrandMarkComponent } from '../../shared/components/atoms/brand-mark/brand-mark';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';

@Component({
  selector: 'app-login-page',
  imports: [LoginFormComponent, BrandMarkComponent, LucideIconComponent, RouterLink],
  template: `
    <div class="myt-login-viewport">
      <div class="myt-paper-grain" aria-hidden="true"></div>
      <main class="myt-login-shell app-container laboratorio-page">
        <a routerLink="/" class="myt-login-back">
          <app-lucide-icon name="arrow-left" [size]="16" />
          <span>Volver al inicio</span>
        </a>
        <section class="myt-login-card card card__body">
          <div class="myt-login-brand">
            <app-brand-mark />
            <div>
              <span class="myt-eyebrow">Plataforma de tutorías académicas</span>
              <h1>Ingreso a MyT</h1>
              <p class="myt-subtitle">Encuentra. Aprende. Avanza.</p>
            </div>
          </div>

          @if (error()) {
            <p class="myt-alert myt-alert--error" role="alert">{{ error() }}</p>
          }
          @if (cargando()) {
            <output class="myt-status-output">Comprobando sesión…</output>
          }

          @if (auth.opciones().length) {
            <div class="myt-role-picker">
              <h2>Elige tu perfil</h2>
              <p class="myt-subtitle">
                Tu cuenta tiene varios perfiles asociados. Selecciona el perfil con el que deseas
                continuar en esta sesión.
              </p>
              <div class="myt-role-picker__grid">
                @for (perfil of auth.opciones(); track perfil) {
                  <button
                    type="button"
                    class="btn btn--primary btn--md myt-btn myt-btn--primary"
                    [disabled]="cargando()"
                    (click)="elegir(perfil)"
                  >
                    Continuar como {{ perfil }}
                  </button>
                }
              </div>
            </div>
          } @else {
            <app-login-form [habilitado]="!cargando()" (loginEnviado)="procesarLogin($event)" />
            <div class="myt-login-footer">
              <p>
                ¿No tienes una cuenta aún?
                <a routerLink="/registro"><strong>Regístrate gratis</strong></a
                >.
              </p>
              <p>
                ¿Quieres conocer primero la plataforma?
                <a routerLink="/">Explora la Landing de MyT</a> o
                <a routerLink="/tutores">consulta el catálogo de tutores</a>.
              </p>
            </div>
          }
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      .myt-login-viewport {
        min-height: 100vh;
        background: #e9e9ea;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem 1.25rem;
        position: relative;
      }
      .myt-login-shell {
        width: 100%;
        max-width: 580px;
        margin: 0 auto;
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .myt-login-back {
        align-self: flex-start;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.85rem;
        font-weight: 700;
        color: #4c5c68;
        text-decoration: none;
      }
      .myt-login-back:hover {
        color: #1985a1;
      }
      .myt-login-card {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 22px;
        padding: 2.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        box-shadow: 0 22px 48px -28px rgba(70, 73, 76, 0.25);
      }
      .myt-login-brand {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .myt-login-brand h1 {
        margin: 0.25rem 0 0.15rem;
        font-size: 1.7rem;
        color: #46494c;
      }
      .myt-role-picker {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1.25rem;
        border-radius: 16px;
        background: #e9e9ea;
        border: 1px solid #c5c3c6;
      }
      .myt-role-picker h2 {
        margin: 0;
        font-size: 1.25rem;
        color: #46494c;
      }
      .myt-role-picker__grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
      }
      .myt-login-footer {
        padding-top: 0.75rem;
        border-top: 1px solid #dcdcdd;
        font-size: 0.85rem;
        color: #4c5c68;
      }
      .myt-login-footer a {
        color: #1985a1;
        font-weight: 700;
        text-decoration: none;
      }
    `,
  ],
})
export class LoginPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly cargando = signal(false);

  ngOnInit() {
    this.cargando.set(true);
    this.auth
      .restaurar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({ next: (e) => this.navegar(e), error: () => undefined });
  }

  procesarLogin(datos: Credenciales) {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set('');
    this.auth
      .iniciarSesion(datos)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({ next: (e) => this.navegar(e), error: (e) => this.error.set(mensajeHttp(e)) });
  }

  elegir(perfil: string) {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set('');
    this.auth
      .elegir(perfil)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({ next: (e) => this.navegar(e), error: (e) => this.error.set(mensajeHttp(e)) });
  }

  private navegar(estado: EstadoSesion) {
    if (estado.actual) {
      if (estado.actual.rol === 'ADMINISTRADOR') {
        void this.router.navigateByUrl('/usuarios');
      } else {
        if (estado.actual.rol === 'TUTOR') {
          this.api.agenda(estado.actual.perfilId).subscribe({
            next: (a) =>
              void this.router.navigateByUrl(
                a.horarios.length ? '/reservas' : '/mi-perfil?setup=1',
              ),
            error: () => void this.router.navigateByUrl('/reservas'),
          });
        } else {
          void this.router.navigateByUrl('/tutores');
        }
      }
    }
  }
}
