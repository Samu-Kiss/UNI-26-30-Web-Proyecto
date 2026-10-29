import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, forkJoin, merge, Subject, switchMap, timer } from 'rxjs';
import { ApiService, ResenaApi, ReservaApi, mensajeHttp } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
@Component({
  selector: 'app-resenas-page',
  imports: [CommonModule, FormsModule],
  template: ` <main class="myt-page-shell">
    <h1>{{ esEstudiante() ? 'Reseñar mis tutorías' : 'Reseñas recibidas' }}</h1>
    @if (cargando()) {
      <p role="status">Cargando reseñas…</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button (click)="cargar()">Reintentar</button>
    }
    @if (mensaje()) {
      <p role="status">{{ mensaje() }}</p>
    }
    @if (!cargando() && !error()) {
      @if (esEstudiante()) {
        @for (r of pendientes(); track r.id) {
          <article class="myt-surface-card">
            <h2>{{ r.tema }} · {{ r.tutor }}</h2>
            <p>{{ r.fecha }} · Completada</p>
            <button class="myt-btn myt-btn--primary" (click)="seleccionar(r)">Añadir reseña</button>
          </article>
        } @empty {
          <p>No tienes tutorías completadas pendientes de reseña.</p>
        }
        @if (seleccionada(); as r) {
          <section class="myt-surface-card">
            <h2>Reseñar tutoría #{{ r.id }}</h2>
            <form #form="ngForm" (ngSubmit)="form.valid && publicar()">
              <fieldset [disabled]="guardando()">
                <label class="form-field"
                  >Puntuación<select name="nota" [(ngModel)]="calificacion">
                    @for (n of [5, 4, 3, 2, 1]; track n) {
                      <option [ngValue]="n">{{ n }} / 5</option>
                    }
                  </select></label
                >
                <label class="form-field"
                  >Comentario<textarea
                    name="comentario"
                    [(ngModel)]="comentario"
                    required
                    maxlength="1000"
                  ></textarea></label
                ><button
                  class="myt-btn myt-btn--primary"
                  [disabled]="form.invalid || !comentario.trim() || guardando()"
                >
                  Publicar reseña
                </button>
              </fieldset>
            </form>
          </section>
        }
      } @else {
        @if (promedio() !== null) {
          <p>★ {{ promedio() | number: '1.1-1' }} · {{ resenas().length }} reseñas</p>
        }
        @for (r of resenas(); track r.id) {
          <article class="myt-surface-card">
            <h2>{{ r.estudiante }} · {{ r.calificacion }} / 5</h2>
            <p>{{ r.comentario }}</p>
          </article>
        } @empty {
          <p>Aún no tienes reseñas.</p>
        }
      }
    }
  </main>`,
})
export class ResenasPageComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly destroyRef = inject(DestroyRef);
  private readonly refrescar = new Subject<void>();
  readonly esEstudiante = computed(() => this.auth.sesion()?.rol === 'ESTUDIANTE');
  readonly reservas = signal<ReservaApi[]>([]);
  readonly resenas = signal<ResenaApi[]>([]);
  readonly seleccionada = signal<ReservaApi | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  calificacion = 5;
  comentario = '';
  readonly pendientes = computed(() =>
    this.reservas().filter(
      (r) => r.estado === 'COMPLETADA' && !this.resenas().some((s) => s.reservaId === r.id),
    ),
  );
  readonly promedio = computed(() =>
    this.resenas().length
      ? this.resenas().reduce((a, r) => a + r.calificacion, 0) / this.resenas().length
      : null,
  );
  ngOnInit() {
    merge(timer(0, 30000), this.refrescar, this.api.cambios)
      .pipe(
        switchMap(() => {
          this.cargando.set(true);
          this.error.set('');
          return forkJoin({ r: this.api.reservas(), s: this.api.resenas() }).pipe(
            catchError((e) => {
              this.error.set(mensajeHttp(e));
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ r, s }) => {
        this.reservas.set(r);
        this.resenas.set(s);
      });
  }
  cargar() {
    this.refrescar.next();
  }
  seleccionar(r: ReservaApi) {
    this.seleccionada.set(r);
    this.comentario = '';
    this.calificacion = 5;
  }
  publicar() {
    const r = this.seleccionada();
    if (!this.esEstudiante() || !r || this.guardando()) return;
    this.guardando.set(true);
    this.api
      .crearResena({
        reservaId: r.id,
        calificacion: this.calificacion,
        comentario: this.comentario.trim(),
      })
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.seleccionada.set(null);
          this.mensaje.set('Reseña publicada.');
          this.cargar();
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
}
