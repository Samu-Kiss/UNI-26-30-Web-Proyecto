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
              <div class="myt-auth-extras__row">
                <button
                  type="button"
                  class="myt-btn myt-btn--secondary myt-btn--sm myt-google-trigger"
                  [disabled]="cargando()"
                  (click)="procesarLoginGoogle()"
                >
                  Continuar con Google
                </button>
                <button
                  type="button"
                  class="myt-link-btn"
                  [disabled]="cargando()"
                  (click)="alternarRecuperacion(true)"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

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
        gap: 0.85rem;
      }
      .myt-auth-extras__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .myt-link-btn {
        background: none;
        border: none;
        color: var(--color-primary);
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        padding: 0.25rem 0;
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
