import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, forkJoin, merge, of, Subject, switchMap, timer } from 'rxjs';
import { AgendaApi, ApiService, ReservaApi, mensajeHttp } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
@Component({
  selector: 'app-calendario-page',
  imports: [CommonModule, RouterLink],
  template: ` <main class="myt-page-shell">
    <header class="myt-page-header">
      <h1>Mi calendario</h1>
      <div class="myt-toolbar-actions">
        <button (click)="cambiarMes(-1)" aria-label="Mes anterior">←</button
        ><strong>{{ mesTexto() }}</strong
        ><button (click)="cambiarMes(1)" aria-label="Mes siguiente">→</button>
      </div>
    </header>
    @if (cargando()) {
      <p role="status">Cargando calendario…</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button (click)="cargar()">Reintentar</button>
    }
    @if (!cargando() && !error()) {
      <section class="myt-surface-card">
        <h2>Reservas de {{ mesTexto() }}</h2>
        <div class="calendar-scroll">
          <div class="calendar-grid" role="grid" aria-label="Calendario mensual">
            @for (d of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']; track d) {
              <strong role="columnheader">{{ d }}</strong>
            }
            @for (d of diasMes(); track $index) {
              <div role="gridcell" class="calendar-day" [class.calendar-day--empty]="!d">
                @if (d) {
                  <strong>{{ d.numero }}</strong>
                  @for (r of d.reservas; track r.id) {
                    <a [routerLink]="['/reservas', r.id]" class="calendar-event"
                      >{{ r.horaInicio.slice(0, 5) }} · {{ r.materia
                      }}<small>{{ r.estado }}</small></a
                    >
                  }
                  @for (b of d.bloqueos; track $index) {
                    <span class="calendar-block"
                      >Bloqueado {{ b.horaInicio.slice(0, 5) }}–{{ b.horaFin.slice(0, 5) }}</span
                    >
                  }
                }
              </div>
            }
          </div>
        </div>
        @for (r of eventos(); track r.id) {
          <article class="calendar-entry">
            <a [routerLink]="['/reservas', r.id]"
              ><strong>{{ r.fecha }} · {{ r.horaInicio.slice(0, 5) }} · {{ r.materia }}</strong></a
            >
            <p>
              {{ r.tema }} · {{ auth.sesion()?.rol === 'TUTOR' ? r.estudiante : r.tutor }} ·
              {{ r.estado }}
            </p>
          </article>
        } @empty {
          <p>No hay reservas en este mes.</p>
        }
      </section>
      @if (auth.sesion()?.rol === 'TUTOR') {
        <section class="myt-surface-card">
          <h2>Disponibilidad semanal</h2>
          @for (h of agenda().horarios; track $index) {
            <p>{{ h.diaSemana }} · {{ h.horaInicio.slice(0, 5) }} – {{ h.horaFin.slice(0, 5) }}</p>
          } @empty {
            <p>Configura tu disponibilidad desde Mi perfil.</p>
          }
          <h3>Bloqueos de este mes</h3>
          @for (b of bloqueosMes(); track $index) {
            <p>
              {{ b.fecha }} · {{ b.horaInicio.slice(0, 5) }} – {{ b.horaFin.slice(0, 5) }} ·
              {{ b.motivo }}
            </p>
          } @empty {
            <p>No hay bloqueos en este mes.</p>
          }
        </section>
      }
      <section class="myt-surface-card">
        <h2>Próximas tutorías</h2>
        @for (r of proximas(); track r.id) {
          <p>
            <a [routerLink]="['/reservas', r.id]"
              >{{ r.fecha }} · {{ r.horaInicio.slice(0, 5) }} · {{ r.tema }} · {{ r.estado }}</a
            >
          </p>
        } @empty {
          <p>No tienes próximas tutorías.</p>
        }
      </section>
    }
  </main>`,
  styles: [
    `
      .calendar-entry {
        padding: 1rem 0;
        border-bottom: 1px solid #ddd;
      }
      .calendar-scroll {
        overflow-x: auto;
        margin: 1rem 0;
      }
      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(100px, 1fr));
        gap: 1px;
        background: #ddd;
        border: 1px solid #ddd;
      }
      .calendar-grid > strong {
        padding: 0.5rem;
        text-align: center;
        background: #e9eef0;
      }
      .calendar-day {
        min-height: 100px;
        padding: 0.5rem;
        background: #fff;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .calendar-day--empty {
        background: #f2f2f2;
      }
      .calendar-event,
      .calendar-block {
        font-size: 0.75rem;
        background: #ddecef;
        padding: 0.25rem;
        border-radius: 5px;
      }
      .calendar-event small {
        display: block;
      }
      .calendar-block {
        background: #fbe7df;
      }
    `,
  ],
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
      reservas: ReservaApi[];
      bloqueos: AgendaApi['bloqueos'];
    } | null)[] = Array.from({ length: offset }, () => null);
    for (let n = 1; n <= total; n++) {
      const fecha = this.prefijo() + '-' + String(n).padStart(2, '0');
      dias.push({
        numero: n,
        reservas: this.eventos().filter((r) => r.fecha === fecha),
        bloqueos: this.bloqueosMes().filter((b) => b.fecha === fecha),
      });
    }
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
  cambiarMes(delta: number) {
    const d = this.mes();
    this.mes.set(new Date(d.getFullYear(), d.getMonth() + delta, 1));
    this.cargar();
  }
}
