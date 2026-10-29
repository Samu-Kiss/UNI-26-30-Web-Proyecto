import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  finalize,
  map,
  merge,
  of,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
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
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reservas-page.html',
})
export class ReservasPageComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly campoMotivo = viewChild<ElementRef<HTMLTextAreaElement>>('campoMotivo');
  private readonly refrescar = new Subject<void>();
  private readonly consultarHoras = new Subject<void>();
  readonly esEstudiante = computed(() => this.auth.sesion()?.rol === 'ESTUDIANTE');
  readonly reservas = signal<ReservaApi[]>([]);
  readonly tutor = signal<TutorApi | null>(null);
  readonly horas = signal<string[]>([]);
  readonly cargandoHoras = signal(false);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly errorHoras = signal('');
  readonly mensaje = signal('');
  readonly cancelando = signal<ReservaApi | null>(null);
  readonly hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
  estado = '';
  motivo = '';
  objetivoSesion = 'Preparar examen';
  objetivoOtro = '';
  readonly objetivosOpciones = [
    'Preparar examen',
    'Resolver ejercicios',
    'Entender un tema',
    'Revisar proyecto',
    'Otro',
  ];
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
    merge(this.consultarHoras, timer(30000, 30000), this.api.cambios)
      .pipe(
        switchMap(() => {
          this.horas.set([]);
          this.errorHoras.set('');
          if (!this.datos.fecha || !this.datos.tutorId) return EMPTY;
          this.cargandoHoras.set(true);
          return this.api
            .horas(this.datos.tutorId, this.datos.fecha, this.datos.duracionMinutos)
            .pipe(
              catchError((e) => {
                this.errorHoras.set(mensajeHttp(e));
                return EMPTY;
              }),
              finalize(() => this.cargandoHoras.set(false)),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((h) => {
        this.horas.set(h);
        if (!h.includes(this.datos.horaInicio)) this.datos.horaInicio = '';
      });
    this.route.queryParamMap
      .pipe(
        map((params) => Number(params.get('tutor'))),
        distinctUntilChanged(),
        switchMap((id) => {
          this.tutor.set(null);
          this.cancelando.set(null);
          this.motivo = '';
          this.error.set('');
          this.mensaje.set('');
          this.datos = {
            tutorId: 0,
            materiaId: 0,
            fecha: '',
            horaInicio: '',
            duracionMinutos: 60,
            tema: '',
            modalidad: 'VIRTUAL',
          };
          this.objetivoSesion = 'Preparar examen';
          this.objetivoOtro = '';
          this.consultarHoras.next();
          if (!Number.isInteger(id) || id <= 0 || !this.esEstudiante()) return of(null);
          return this.api.tutor(id).pipe(
            catchError((e) => {
              this.error.set(mensajeHttp(e));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((t) => {
        this.tutor.set(t);
        this.datos.tutorId = t?.id ?? 0;
        this.datos.materiaId = t?.materias[0]?.id ?? 0;
        if (!t) this.cargar();
      });
    merge(timer(0, 30000), this.refrescar, this.api.cambios)
      .pipe(
        switchMap(() => {
          this.cargando.set(true);
          this.error.set('');
          return this.api.reservas(this.estado).pipe(
            catchError((e) => {
              this.reservas.set([]);
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
  cargarHoras() {
    this.datos.horaInicio = '';
    this.consultarHoras.next();
  }
  costoEstimado() {
    return ((this.tutor()?.tarifaPorHora ?? 0) * this.datos.duracionMinutos) / 60;
  }
  crear() {
    if (this.guardando() || !this.horas().includes(this.datos.horaInicio)) return;
    const objetivo =
      this.objetivoSesion === 'Otro' ? this.objetivoOtro.trim() : this.objetivoSesion;
    if (!objetivo) {
      this.error.set('Especifica el objetivo de la sesión.');
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    this.api
      .crearReserva({ ...this.datos, objetivo })
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) =>
          void this.router.navigate(['/reservas', r.id], { queryParams: { creada: '1' } }),
        error: (e) => {
          this.error.set(mensajeHttp(e));
          this.cargarHoras();
        },
      });
  }
  cambiar(r: ReservaApi, estado: EstadoReserva) {
    if (this.guardando()) return;
    let motivo = '';
    if (estado === 'CANCELADA') {
      if (this.cancelando()?.id !== r.id) return;
      motivo = this.motivo.trim();
      if (!motivo || motivo.length > 500) {
        this.error.set('Indica un motivo de entre 1 y 500 caracteres.');
        return;
      }
    }
    this.guardando.set(true);
    this.error.set('');
    this.api
      .estadoReserva(r.id, estado, motivo)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.cancelando.set(null);
          this.motivo = '';
          this.mensaje.set('Reserva actualizada.');
          this.cargar();
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
  cancelar(r: ReservaApi) {
    if (this.guardando()) return;
    this.cancelando.set(r);
    this.motivo = '';
    this.error.set('');
    this.mensaje.set('');
    afterNextRender(() => this.campoMotivo()?.nativeElement.focus(), { injector: this.injector });
  }
  volverSinCancelar() {
    if (this.guardando()) return;
    this.cancelando.set(null);
    this.motivo = '';
  }
}
