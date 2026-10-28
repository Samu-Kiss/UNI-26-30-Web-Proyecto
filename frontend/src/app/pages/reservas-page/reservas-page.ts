import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, finalize, startWith, switchMap } from 'rxjs';
import {
  ApiService,
  EstadoReserva,
  ReservaAlta,
  ReservaApi,
  TutorApi,
  mensajeHttp,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
@Component({
  selector: 'app-reservas-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './reservas-page.html',
})
export class ReservasPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refrescar = new Subject<void>();
  readonly reservas = signal<ReservaApi[]>([]);
  readonly tutor = signal<TutorApi | null>(null);
  readonly error = signal('');
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  estado = '';
  motivo = '';
  datos: ReservaAlta = {
    tutorId: 0,
    materiaId: 0,
    fecha: '',
    horaInicio: '',
    duracionMinutos: 60,
    tema: '',
    modalidad: 'VIRTUAL',
  };
  ngOnInit() {
    const id = Number(this.route.snapshot.queryParamMap.get('tutor'));
    if (id > 0) {
      this.api
        .tutor(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (t) => {
            this.tutor.set(t);
            this.datos.tutorId = t.id;
            this.datos.materiaId = t.materias[0]?.id ?? 0;
          },
          error: (e) => this.error.set(mensajeHttp(e)),
        });
    }
    this.refrescar
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.cargando.set(true);
          this.error.set('');
          return this.api.reservas(this.estado).pipe(
            catchError((e) => {
              this.error.set(mensajeHttp(e));
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((r) => this.reservas.set(r));
  }
  cargar() {
    this.refrescar.next();
  }
  crear() {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.api
      .crearReserva(this.datos)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.mensaje.set('Reserva creada.');
          this.datos.tema = '';
          this.cargar();
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
  cambiar(reserva: ReservaApi, estado: EstadoReserva) {
    if (this.guardando()) return;
    if (
      estado === 'CANCELADA' &&
      (!this.motivo.trim() || !window.confirm('¿Cancelar esta reserva?'))
    )
      return;
    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.api
      .estadoReserva(reserva.id, estado, this.motivo)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.mensaje.set('Estado actualizado.');
          this.cargar();
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
  cancelar(reserva: ReservaApi) {
    if (this.guardando() || !window.confirm('¿Cancelar esta reserva conservando su historial?'))
      return;
    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.api
      .cancelarReserva(reserva.id)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.mensaje.set('Reserva cancelada.');
          this.cargar();
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
}
