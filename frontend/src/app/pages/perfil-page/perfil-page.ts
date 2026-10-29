import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { mensajeHttp } from '../../core/services/api.service';
import { Usuario } from '../../core/models/usuario.model';
import { AgendaEditorComponent } from '../../shared/components/organisms/agenda-editor/agenda-editor';
@Component({
  selector: 'app-perfil-page',
  imports: [FormsModule, AgendaEditorComponent],
  template: ` <main class="myt-page-shell">
    <h1>Mi perfil</h1>
    @if (cargando()) {
      <p role="status">Cargando perfil…</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button (click)="cargar()">Reintentar</button>
    }
    @if (mensaje()) {
      <p role="status">{{ mensaje() }}</p>
    }
    @if (usuario(); as u) {
      <section class="myt-surface-card">
        <h2>Datos personales</h2>
        <form #form="ngForm" (ngSubmit)="form.valid && guardar()">
          <fieldset [disabled]="guardando()">
            <label class="form-field"
              >Nombre<input name="nombre" [(ngModel)]="u.nombre" required maxlength="100"
            /></label>
            <label class="form-field"
              >Apellido<input name="apellido" [(ngModel)]="u.apellido" required maxlength="100"
            /></label>
            <label class="form-field"
              >Correo<input
                name="correo"
                type="email"
                email
                [(ngModel)]="u.correo"
                required
                maxlength="120"
            /></label>
            <label class="form-field"
              >Teléfono<input
                name="telefono"
                type="tel"
                [(ngModel)]="u.telefono"
                pattern="([+]57)?[0-9]{10}"
                #tel="ngModel"
            /></label>
            @if (tel.invalid) {
              <p role="alert">Ingresa 10 dígitos, opcionalmente precedidos por +57.</p>
            }
            <button class="myt-btn myt-btn--primary" [disabled]="form.invalid || guardando()">
              Guardar perfil
            </button>
          </fieldset>
        </form>
      </section>
    }
    @if (auth.sesion()?.rol === 'TUTOR') {
      <p>Completa tu disponibilidad para que los estudiantes puedan reservar contigo.</p>
      <app-agenda-editor [tutorId]="auth.sesion()!.perfilId" />
    }
  </main>`,
})
export class PerfilPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  readonly destroyRef = inject(DestroyRef);
  readonly usuario = signal<Usuario | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.http
      .get<Usuario>('/api/perfil')
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (u) => this.usuario.set(u),
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
  guardar() {
    const u = this.usuario();
    if (!u || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.http
      .put<Usuario>('/api/perfil', u)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => {
          this.usuario.set(r);
          this.mensaje.set('Perfil actualizado.');
          this.auth.sesion.update((s) =>
            s ? { ...s, nombreUsuario: r.nombre + ' ' + r.apellido } : s,
          );
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
}
