import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  imports: [FormsModule, LoginFormComponent, BrandMarkComponent, LucideIconComponent, RouterLink],
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
          @if (mensajeExito()) {
            <output class="myt-alert myt-alert--success" role="status">{{ mensajeExito() }}</output>
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
          } @else if (modoRecuperacion()) {
            <div class="myt-recovery-panel" aria-label="Recuperación de contraseña">
              <h2>Recuperar contraseña</h2>
              <p class="myt-subtitle">
                Solicita un código temporal y define tu nueva contraseña protegida con BCrypt.
              </p>

              <form class="laboratorio-form" (ngSubmit)="solicitarCodigoRecuperacion()">
                <label class="form-field"
                  >Correo registrado
                  <input
                    class="text-input"
                    type="email"
                    name="correoRecuperacion"
                    [(ngModel)]="correoRecuperacion"
                    required
                    autocomplete="email"
                    placeholder="user1@myt.edu.co"
                  />
                </label>
                <button
                  type="submit"
                  class="btn btn--secondary btn--md myt-btn myt-btn--secondary"
                  [disabled]="cargando() || !correoRecuperacion.trim()"
                >
                  Generar código de recuperación
                </button>
              </form>

              @if (tokenGenerado()) {
                <div class="myt-demo-token" role="status">
                  <strong>Código generado (entorno local):</strong>
                  <code>{{ tokenGenerado() }}</code>
                </div>
              }

              <form class="laboratorio-form" (ngSubmit)="confirmarRestablecimiento()">
                <label class="form-field"
                  >Código de verificación
                  <input
                    class="text-input"
                    type="text"
                    name="tokenRestablecimiento"
                    [(ngModel)]="tokenRestablecimiento"
                    required
                    autocomplete="one-time-code"
                    placeholder="MYT-XXXXXX"
                  />
                </label>
                <label class="form-field"
                  >Nueva contraseña (mínimo 8 caracteres)
                  <input
                    class="text-input"
                    type="password"
                    name="nuevaContrasena"
                    [(ngModel)]="nuevaContrasena"
                    required
                    minlength="8"
                    autocomplete="new-password"
                  />
                </label>
                <div class="myt-recovery-actions">
                  <button
                    type="submit"
                    class="btn btn--primary btn--md myt-btn myt-btn--primary"
                    [disabled]="
                      cargando() ||
                      !tokenRestablecimiento.trim() ||
                      nuevaContrasena.length < 8
                    "
                  >
                    Actualizar contraseña
                  </button>
                  <button
                    type="button"
                    class="btn btn--secondary btn--md myt-btn myt-btn--secondary"
                    (click)="alternarRecuperacion(false)"
                  >
                    Volver al login
                  </button>
                </div>
              </form>
            </div>
          } @else {
            <app-login-form [habilitado]="!cargando()" (loginEnviado)="procesarLogin($event)" />

            <div class="myt-auth-extras">
              <div class="myt-auth-extras__actions">
                <button
                  type="button"
                  class="myt-link-btn"
                  [disabled]="cargando()"
                  (click)="alternarRecuperacion(true)"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div class="myt-auth-divider" aria-hidden="true">
                <span>o continúa con</span>
              </div>

              <button
                type="button"
                class="myt-google-btn myt-google-trigger"
                [disabled]="cargando()"
                (click)="procesarLoginGoogle()"
              >
                <svg class="myt-google-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continuar con Google</span>
              </button>

              <div class="myt-demo-accounts" aria-label="Cuentas de prueba Spring Security">
                <span class="myt-demo-accounts__label"
                  >Acceso rápido de sustentación (InMemory + BCrypt):</span
                >
                <div class="myt-demo-accounts__chips">
                  <button
                    type="button"
                    class="myt-demo-chip"
                    [disabled]="cargando()"
                    (click)="usarCuentaPrueba('user1@myt.edu.co')"
                  >
                    USER 1 · Estudiante
                  </button>
                  <button
                    type="button"
                    class="myt-demo-chip"
                    [disabled]="cargando()"
                    (click)="usarCuentaPrueba('user2@myt.edu.co')"
                  >
                    USER 2 · Tutor
                  </button>
                  <button
                    type="button"
                    class="myt-demo-chip myt-demo-chip--admin"
                    [disabled]="cargando()"
                    (click)="usarCuentaPrueba('admin@myt.edu.co')"
                  >
                    ADMIN · Administrador
                  </button>
                </div>
              </div>
            </div>

            <div class="myt-login-footer">
              <p>
                ¿No tienes una cuenta aún?
                <a routerLink="/registro"><strong>Regístrate gratis</strong></a
                >.
              </p>
              <p>
                ¿Quieres conocer primero la plataforma?
                <a routerLink="/">Explora la Landing de MyT</a>.
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
        background: var(--color-bg-body);
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
        color: var(--color-text-subtle);
        text-decoration: none;
      }
      .myt-login-back:hover {
        color: var(--color-primary);
      }
      .myt-login-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        padding: 2.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        box-shadow: var(--shadow-card);
      }
      .myt-login-brand {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .myt-login-brand h1 {
        margin: 0.25rem 0 0.15rem;
        font-size: 1.7rem;
        color: var(--color-text-main);
      }
      .myt-role-picker,
      .myt-recovery-panel {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1.25rem;
        border-radius: var(--radius-lg);
        background: var(--color-bg-body);
        border: 1px solid var(--color-border-strong);
      }
      .myt-role-picker h2,
      .myt-recovery-panel h2 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--color-text-main);
      }
      .myt-role-picker__grid,
      .myt-recovery-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
      }
      .myt-auth-extras {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }
      .myt-auth-extras__actions {
        display: flex;
        justify-content: flex-end;
        margin-top: -0.35rem;
      }
      .myt-auth-divider {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        color: var(--color-text-muted);
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .myt-auth-divider::before,
      .myt-auth-divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--color-border);
      }
      .myt-google-btn {
        width: 100%;
        min-height: 3rem;
        padding: 0.65rem 1.25rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.65rem;
        border-radius: 12px;
        border: 1px solid var(--color-border-strong);
        background: #ffffff;
        color: var(--color-text-main);
        font-size: 0.94rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
        transition:
          background-color 140ms ease,
          border-color 140ms ease,
          box-shadow 140ms ease;
      }
      .myt-google-btn:hover:not(:disabled) {
        background: #f8fafc;
        border-color: var(--color-primary);
        box-shadow: 0 2px 6px rgba(18, 110, 135, 0.12);
      }
      .myt-google-btn:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }
      .myt-google-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .myt-google-btn__icon {
        width: 19px;
        height: 19px;
        flex-shrink: 0;
      }
      .myt-link-btn {
        background: none;
        border: none;
        color: var(--color-primary);
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        padding: 0.2rem 0;
      }
      .myt-link-btn:hover:not(:disabled) {
        text-decoration: underline;
      }
      .myt-demo-token {
        padding: 0.65rem 0.85rem;
        border-radius: var(--radius-md);
        background: var(--color-surface);
        border: 1px dashed var(--color-primary);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        font-size: 0.85rem;
      }
      .myt-demo-accounts {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        padding-top: 0.5rem;
        border-top: 1px dashed var(--color-border);
      }
      .myt-demo-accounts__label {
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--color-text-subtle);
      }
      .myt-demo-accounts__chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }
      .myt-demo-chip {
        font-size: 0.78rem;
        font-weight: 700;
        padding: 0.35rem 0.65rem;
        border-radius: 999px;
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-body);
        color: var(--color-text-main);
        cursor: pointer;
      }
      .myt-demo-chip--admin {
        border-color: var(--color-primary);
        color: var(--color-primary);
      }
      .myt-alert--success {
        display: block;
        padding: 0.75rem 1rem;
        border-radius: var(--radius-md);
        background: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
        font-size: 0.9rem;
        font-weight: 600;
      }
      .myt-login-footer {
        padding-top: 0.75rem;
        border-top: 1px solid var(--color-border);
        font-size: 0.85rem;
        color: var(--color-text-subtle);
      }
      .myt-login-footer a {
        color: var(--color-primary);
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
  private readonly document = inject(DOCUMENT);
  readonly error = signal('');
  readonly mensajeExito = signal('');
  readonly cargando = signal(false);
  readonly modoRecuperacion = signal(false);
  readonly tokenGenerado = signal('');
  readonly urlRedireccionGoogle = signal('');

  correoRecuperacion = '';
  tokenRestablecimiento = '';
  nuevaContrasena = '';

  ngOnInit() {
    const callback = this.extraerCallbackOAuth();
    if (callback?.error) {
      this.error.set(callback.error);
      return;
    }
    if (callback?.token) {
      this.autenticarConTokenGoogle(callback.token);
      return;
    }
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
    this.mensajeExito.set('');
    this.auth
      .iniciarSesion(datos)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({ next: (e) => this.navegar(e), error: (e) => this.error.set(mensajeHttp(e)) });
  }

  usarCuentaPrueba(correo: string) {
    this.procesarLogin({ correo, contrasena: '1ManzanaGrande!' });
  }

  procesarLoginGoogle(credencialOpcional?: string) {
    if (this.cargando()) return;
    if (credencialOpcional?.trim()) {
      this.autenticarConTokenGoogle(credencialOpcional.trim());
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    this.mensajeExito.set('');
    const origin = this.document.defaultView?.location?.origin ?? 'http://localhost:4200';
    const redirectTo = `${origin}/login`;
    this.auth
      .obtenerUrlGoogle(redirectTo)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (res) => this.redirigirAGoogle(res.url),
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }

  autenticarConTokenGoogle(token: string) {
    if (this.cargando() || !token.trim()) return;
    this.cargando.set(true);
    this.error.set('');
    this.mensajeExito.set('');
    this.auth
      .iniciarSesionGoogle(token.trim())
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({ next: (e) => this.navegar(e), error: (e) => this.error.set(mensajeHttp(e)) });
  }

  redirigirAGoogle(url: string) {
    this.urlRedireccionGoogle.set(url);
    const win = this.document.defaultView;
    if (win && !win.navigator?.userAgent?.includes('jsdom')) {
      win.location.assign(url);
    }
  }

  private extraerCallbackOAuth(): { token?: string; error?: string } | null {
    const win = this.document.defaultView;
    if (!win) return null;
    const routerHashIdx = this.router.url.indexOf('#');
    const routerHash = routerHashIdx !== -1 ? this.router.url.slice(routerHashIdx + 1) : '';
    const rawHash = win.location.hash.startsWith('#')
      ? win.location.hash.slice(1)
      : win.location.hash;
    const hash = rawHash || routerHash;
    const search = win.location.search.startsWith('?')
      ? win.location.search.slice(1)
      : win.location.search;
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(search);

    const errorDesc =
      hashParams.get('error_description') ??
      queryParams.get('error_description') ??
      hashParams.get('error') ??
      queryParams.get('error');
    if (errorDesc) {
      this.limpiarUrlOAuth(win);
      return { error: errorDesc };
    }

    const token =
      hashParams.get('access_token') ??
      queryParams.get('access_token') ??
      hashParams.get('id_token') ??
      queryParams.get('code');
    if (token) {
      this.limpiarUrlOAuth(win);
      return { token };
    }
    return null;
  }

  private limpiarUrlOAuth(win: Window) {
    try {
      win.history.replaceState(null, '', win.location.pathname);
    } catch {
      // Ignorar si el entorno no soporta history.replaceState
    }
  }

  alternarRecuperacion(activo: boolean) {
    this.modoRecuperacion.set(activo);
    this.error.set('');
    this.mensajeExito.set('');
    this.tokenGenerado.set('');
  }

  solicitarCodigoRecuperacion() {
    if (this.cargando() || !this.correoRecuperacion.trim()) return;
    this.cargando.set(true);
    this.error.set('');
    this.mensajeExito.set('');
    this.auth
      .solicitarRecuperacion(this.correoRecuperacion.trim())
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (res) => {
          this.tokenGenerado.set(res.tokenRecuperacion);
          this.tokenRestablecimiento = res.tokenRecuperacion;
          this.mensajeExito.set(res.mensaje);
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }

  confirmarRestablecimiento() {
    if (
      this.cargando() ||
      !this.tokenRestablecimiento.trim() ||
      this.nuevaContrasena.length < 8
    ) {
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    this.mensajeExito.set('');
    this.auth
      .restablecerContrasena(this.tokenRestablecimiento.trim(), this.nuevaContrasena)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (res) => {
          this.modoRecuperacion.set(false);
          this.tokenGenerado.set('');
          this.nuevaContrasena = '';
          this.mensajeExito.set(res.mensaje);
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
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
      } else if (estado.actual.rol === 'TUTOR') {
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
