import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, forkJoin, merge, of, Subject, switchMap, timer } from 'rxjs';
import { AgendaApi, ApiService, ReservaApi, mensajeHttp } from '../../core/services/api.service';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';
import { AuthService } from '../../core/services/auth.service';
@Component({
  selector: 'app-calendario-page',
  imports: [CommonModule, RouterLink, LucideIconComponent],
  templateUrl: './calendario-page.html',
  styleUrl: './calendario-page.css',
})
export class CalendarioPageComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly destroyRef = inject(DestroyRef);
  private readonly refrescar = new Subject<void>();
  readonly mes = signal(
    new Date(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' }) + 'T12:00:00'),
  );
  readonly reservas = signal<ReservaApi[]>([]);
  readonly agenda = signal<AgendaApi>({ horarios: [], bloqueos: [] });
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
  readonly pendientes = computed(
    () => this.reservas().filter((r) => r.estado === 'PENDIENTE').length,
  );
  readonly completadas = computed(
    () => this.reservas().filter((r) => r.estado === 'COMPLETADA').length,
  );
  readonly totalProximas = computed(
    () =>
      this.reservas().filter(
        (r) =>
          ['PENDIENTE', 'CONFIRMADA', 'EN_CURSO'].includes(r.estado) &&
          r.fecha + ' ' + r.horaInicio >=
            new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' }),
      ).length,
  );
  readonly mesTexto = computed(() =>
    this.mes().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
  );
  readonly prefijo = computed(
    () => this.mes().getFullYear() + '-' + String(this.mes().getMonth() + 1).padStart(2, '0'),
  );
  readonly diasMes = computed(() => {
    const d = this.mes();
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
    const offset = (inicio.getDay() + 6) % 7;
    const total = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const dias: ({
      numero: number;
      fecha: string;
      reservas: ReservaApi[];
      bloqueos: AgendaApi['bloqueos'];
    } | null)[] = Array.from({ length: offset }, () => null);
    for (let n = 1; n <= total; n++) {
      const fecha = this.prefijo() + '-' + String(n).padStart(2, '0');
      dias.push({
        numero: n,
        fecha,
        reservas: this.eventos().filter((r) => r.fecha === fecha),
        bloqueos: this.bloqueosMes().filter((b) => b.fecha === fecha),
      });
    }
    while (dias.length % 7) dias.push(null);
    return dias;
  });
  readonly eventos = computed(() =>
    this.reservas()
      .filter((r) => r.fecha.startsWith(this.prefijo()))
      .sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio)),
  );
  readonly bloqueosMes = computed(() =>
    this.agenda().bloqueos.filter((b) => b.fecha.startsWith(this.prefijo())),
  );
  readonly proximas = computed(() => {
    const ahora = new Date()
      .toLocaleString('sv-SE', { timeZone: 'America/Bogota' })
      .replace(' ', 'T');
    return this.reservas()
      .filter(
        (r) =>
          ['PENDIENTE', 'CONFIRMADA', 'EN_CURSO'].includes(r.estado) &&
          r.fecha + 'T' + r.horaInicio >= ahora,
      )
      .sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio))
      .slice(0, 5);
  });
  ngOnInit() {
    merge(timer(0, 30000), this.refrescar, this.api.cambios)
      .pipe(
        switchMap(() => {
          this.cargando.set(true);
          this.error.set('');
          const s = this.auth.sesion();
          return forkJoin({
            r: this.api.reservas(),
            a:
              s?.rol === 'TUTOR' ? this.api.agenda(s.perfilId) : of({ horarios: [], bloqueos: [] }),
          }).pipe(
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
      .subscribe(({ r, a }) => {
        this.reservas.set(r);
        this.agenda.set(a);
      });
  }
  cargar() {
    this.refrescar.next();
  }
  irHoy() {
    this.mes.set(new Date(this.hoy + 'T12:00:00'));
    this.cargar();
  }
  cambiarMes(delta: number) {
    const d = this.mes();
    this.mes.set(new Date(d.getFullYear(), d.getMonth() + delta, 1));
    this.cargar();
  }
}
