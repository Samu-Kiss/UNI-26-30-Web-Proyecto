import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Credenciales } from '../../core/models/usuario.model';
import { AuthService, EstadoSesion } from '../../core/services/auth.service';
import { mensajeHttp } from '../../core/services/api.service';
import { LoginFormComponent } from '../../shared/components/organisms/login-form/login-form';
import { BrandMarkComponent } from '../../shared/components/atoms/brand-mark/brand-mark';

@Component({
  selector: 'app-login-page',
  imports: [LoginFormComponent, BrandMarkComponent, RouterLink],
  template: `
    <main class="myt-login-shell app-container laboratorio-page">
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
              ¿Quieres conocer primero la plataforma?
              <a routerLink="/landing">Explora la Landing de MyT</a> o
              <a routerLink="/tutores">consulta el catálogo de tutores</a>.
            </p>
          </div>
        }
      </section>
    </main>
  `,
  styles: [
    `
      .myt-login-shell {
        max-width: 580px;
        margin: 1.5rem auto;
      }
      .myt-login-card {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 22px;
        padding: 2.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
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
    if (estado.actual) void this.router.navigateByUrl('/tutores');
  }
}
