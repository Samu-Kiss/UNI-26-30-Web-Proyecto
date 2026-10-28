import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Credenciales } from '../../core/models/usuario.model';
import { AuthService, EstadoSesion } from '../../core/services/auth.service';
import { mensajeHttp } from '../../core/services/api.service';
import { LoginFormComponent } from '../../shared/components/organisms/login-form/login-form';
import { BrandMarkComponent } from '../../shared/components/atoms/brand-mark/brand-mark';
@Component({
  selector: 'app-login-page',
  imports: [LoginFormComponent, BrandMarkComponent],
  template: `<main class="app-container laboratorio-page">
    <section class="card card__body">
      <app-brand-mark />
      <h1>Ingreso a MyT</h1>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (cargando()) {
        <output>Comprobando sesión…</output>
      }
      @if (auth.opciones().length) {
        <h2>Elige tu perfil</h2>
        @for (perfil of auth.opciones(); track perfil) {
          <button class="btn btn--primary btn--md" [disabled]="cargando()" (click)="elegir(perfil)">
            {{ perfil }}
          </button>
        }
      } @else {
        <app-login-form [habilitado]="!cargando()" (loginEnviado)="procesarLogin($event)" />
      }
    </section>
  </main>`,
})
export class LoginPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly cargando = signal(false);
  ngOnInit() {
    this.cargando.set(true);
    this.auth.restaurar().pipe(finalize(() => this.cargando.set(false)))
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
