import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, forkJoin, merge, Subject, switchMap, timer } from 'rxjs';
import { ApiService, ResenaApi, ReservaApi, mensajeHttp } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';

@Component({
  selector: 'app-resenas-page',
  imports: [CommonModule, FormsModule, RouterLink, LucideIconComponent, AvatarComponent],
  templateUrl: './resenas-page.html',
  styleUrl: './resenas-page.css',
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
