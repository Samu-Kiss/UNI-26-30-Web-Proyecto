import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  firstValueFrom,
  catchError,
  EMPTY,
  finalize,
  forkJoin,
  merge,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
import { ApiService, ResenaApi, TutorApi, mensajeHttp } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AgendaEditorComponent } from '../../shared/components/organisms/agenda-editor/agenda-editor';
@Component({
  selector: 'app-tutor-perfil-page',
  imports: [CommonModule, FormsModule, RouterLink, AgendaEditorComponent],
  template: ` <main class="myt-page-shell">
    <a routerLink="/tutores">Volver al catálogo</a>
    @if (cargando()) {
      <p role="status">Cargando perfil…</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button (click)="cargar()">Reintentar</button>
    }
    @if (tutorApi(); as t) {
      <section class="myt-surface-card">
        <h1>{{ t.nombre }}</h1>
        <p>{{ t.biografia }}</p>
        <p>
          @for (m of t.materias; track m.id) {
            <span class="myt-subject-tag">{{ m.nombre }}</span>
          }
        </p>
        <p>{{ t.tarifaPorHora | currency: 'COP' : 'symbol' : '1.0-0' }} / hora</p>
        @if (t.calificacion !== null) {
          <p>★ {{ t.calificacion | number: '1.1-1' }} · {{ resenas().length }} reseñas</p>
        } @else {
          <p>Sin reseñas</p>
        }
        @if (auth.sesion()?.rol === 'ESTUDIANTE') {
          <a routerLink="/reservas" [queryParams]="{ tutor: t.id }" class="myt-btn myt-btn--primary"
            >Reservar tutoría</a
          >
        }
      </section>
      @if (esPropietario()) {
        <app-agenda-editor [tutorId]="t.id" />
      }
      <section class="myt-surface-card">
        <h2>Próxima disponibilidad</h2>
        @if (cargandoDisponibilidad()) {
          <p role="status">Consultando horarios…</p>
        } @else {
          @if (proxima()) {
            <p>{{ proxima() }}</p>
          } @else {
            <p>Sin disponibilidad en los próximos 30 días.</p>
          }
        }
      </section>
      <section class="myt-surface-card">
        <h2>Reseñas recibidas</h2>
        @for (r of resenas(); track r.id) {
          <article>
            <strong>{{ r.estudiante }} · {{ r.calificacion }} / 5</strong>
            <p>{{ r.comentario }}</p>
          </article>
        } @empty {
          <p>Aún no hay reseñas.</p>
        }
      </section>
    }
  </main>`,
})
export class TutorPerfilPageComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly route = inject(ActivatedRoute);
  readonly destroyRef = inject(DestroyRef);
  readonly tutorApi = signal<TutorApi | null>(null);
  readonly resenas = signal<ResenaApi[]>([]);
  readonly cargando = signal(true);
  readonly cargandoDisponibilidad = signal(true);
  readonly error = signal('');
  readonly proxima = signal('');
  readonly esPropietario = computed(
    () =>
      this.auth.sesion()?.rol === 'TUTOR' && this.auth.sesion()?.perfilId === this.tutorApi()?.id,
  );
  private readonly refrescar = new Subject<void>();
  ngOnInit() {
    merge(timer(0, 30000), this.refrescar, this.api.cambios)
      .pipe(
        switchMap(() => {
          this.cargando.set(true);
          this.error.set('');
          const id = Number(this.route.snapshot.paramMap.get('id'));
          return forkJoin({ t: this.api.tutor(id), r: this.api.resenas(id) }).pipe(
            catchError((e) => {
              this.error.set(mensajeHttp(e));
              this.tutorApi.set(null);
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ t, r }) => {
        this.tutorApi.set(t);
        this.resenas.set(r);
        void this.buscarProxima(t.id);
      });
  }
  cargar() {
    this.refrescar.next();
  }
  private async buscarProxima(id: number) {
    this.cargandoDisponibilidad.set(true);
    this.proxima.set('');
    try {
      for (let i = 0; i < 30; i++) {
        const d = new Date(
          new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' }) + 'T12:00:00',
        );
        d.setDate(d.getDate() + i);
        const fecha = d.toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
        const horas = await firstValueFrom(
          this.api.horas(id, fecha, 60).pipe(takeUntilDestroyed(this.destroyRef)),
        );
        if (horas.length) {
          this.proxima.set(fecha + ' · ' + horas[0].slice(0, 5));
          break;
        }
      }
    } catch (e) {
      this.error.set(mensajeHttp(e));
    } finally {
      this.cargandoDisponibilidad.set(false);
    }
  }
}
