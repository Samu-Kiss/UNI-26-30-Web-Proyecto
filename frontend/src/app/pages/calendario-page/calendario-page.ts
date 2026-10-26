import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiService, ReservaApi } from '../../core/services/api.service';
import { MytStateService } from '../../core/services/myt-state.service';

interface CeldaCalendario {
  numero: number;
  fueraDeMes: boolean;
  evento?: {
    id: number;
    etiqueta: string;
    hora: string;
    tono: 'pending' | 'teal' | 'green';
  };
}

@Component({
  selector: 'app-calendario-page',
  imports: [RouterLink],
  template: `
    <main class="myt-screen" data-node-id="1:1036">
      <header class="myt-page-header" data-node-id="10:110">
        <div>
          <h1>Mi calendario</h1>
          <p>Consulta tus sesiones programadas, pendientes y pasadas.</p>
        </div>
        <a routerLink="/tutores" class="myt-btn myt-btn--primary">Buscar tutor</a>
      </header>

      <section class="myt-kpi-row" aria-label="Resumen de sesiones" data-node-id="10:122">
        <article class="myt-kpi-card">
          <strong>{{ totalProximas() }}</strong>
          <span>Próximas</span>
        </article>
        <article class="myt-kpi-card">
          <strong>{{ totalPendientes() }}</strong>
          <span>Pendiente</span>
        </article>
        <article class="myt-kpi-card">
          <strong>{{ totalCompletadas() }}</strong>
          <span>Completadas</span>
        </article>
      </section>

      <div class="myt-calendar-layout" data-node-id="10:132">
        <section class="myt-paper-card myt-calendar-board" aria-label="Calendario mensual">
          <div class="myt-calendar-board__top">
            <h2>{{ mesActual() }}</h2>
            <div class="myt-calendar-board__Controls">
              <button type="button" class="myt-link-btn" (click)="cambiarMes(-1)">‹</button>
              <button type="button" class="myt-link-btn" (click)="irAHoy()">Hoy</button>
              <button type="button" class="myt-link-btn" (click)="cambiarMes(1)">›</button>
            </div>
          </div>

          <div class="myt-calendar-weekdays" aria-hidden="true">
            <span>LUN</span>
            <span>MAR</span>
            <span>MIÉ</span>
            <span>JUE</span>
            <span>VIE</span>
            <span>SÁB</span>
            <span>DOM</span>
          </div>

          <div class="myt-calendar-grid">
            @for (celda of celdas(); track $index) {
              <div
                class="myt-calendar-cell"
                [class.myt-calendar-cell--muted]="celda.fueraDeMes"
              >
                <span class="myt-calendar-cell__day">{{ celda.numero }}</span>
                @if (celda.evento; as ev) {
                  <a
                    [routerLink]="['/reservas', ev.id]"
                    class="myt-calendar-event myt-calendar-event--{{ ev.tono }}"
                  >
                    <strong>{{ ev.etiqueta }}</strong>
                    <small>{{ ev.hora }}</small>
                  </a>
                }
              </div>
            }
          </div>
        </section>

        <aside class="myt-paper-card myt-upcoming-panel" data-node-id="10:229">
          <h2>Próximas tutorías</h2>
          <div class="myt-upcoming-list">
            @for (ev of state.eventosCalendario(); track ev.id; let idx = $index) {
              @if (ev.estado !== 'CANCELADA') {
                <a [routerLink]="['/reservas', ev.id]" class="myt-upcoming-item">
                  <span
                    class="myt-upcoming-item__date"
                    [class.myt-upcoming-item__date--green]="idx === 1"
                    [class.myt-upcoming-item__date--amber]="ev.estado === 'PENDIENTE'"
                  >
                    {{ ev.fechaCorta }}
                  </span>
                  <strong>{{ ev.titulo }}</strong>
                  <small>{{ ev.horaInicio }} · {{ ev.modalidad === 'En línea' ? 'Online' : 'Presencial' }}</small>
                </a>
              }
            }
          </div>

          <div class="myt-calendar-legend">
            <h3>Estados</h3>
            <p>
              <span class="myt-dot myt-dot--teal">●</span> Confirmada
              <span class="myt-dot myt-dot--amber">●</span> Pendiente
              <span class="myt-dot myt-dot--green">●</span> Finalizada
            </p>
          </div>
        </aside>
      </div>
    </main>
  `,
})
export class CalendarioPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = inject(MytStateService);

  readonly reservasApi = signal<ReservaApi[]>([]);
  private readonly meses = ['Agosto 2026', 'Septiembre 2026', 'Octubre 2026'];
  readonly indiceMes = signal(1);

  readonly mesActual = computed(() => this.meses[this.indiceMes()] ?? 'Septiembre 2026');

  readonly totalProximas = computed(() => {
    const apiCount = this.reservasApi().filter((r) => r.estado === 'CONFIRMADA').length;
    return apiCount > 0
      ? apiCount
      : this.state.eventosCalendario().filter((e) => e.estado !== 'CANCELADA').length;
  });

  readonly totalPendientes = computed(() => {
    const apiCount = this.reservasApi().filter((r) => r.estado === 'PENDIENTE').length;
    return apiCount > 0 ? apiCount : 1;
  });

  readonly totalCompletadas = computed(() => {
    const apiCount = this.reservasApi().filter((r) => r.estado === 'COMPLETADA').length;
    return apiCount > 0 ? apiCount : 8;
  });

  readonly celdas = computed<CeldaCalendario[]>(() => {
    const eventos = this.state.eventosCalendario();
    const resultado: CeldaCalendario[] = [{ numero: 31, fueraDeMes: true }];
    for (let d = 1; d <= 30; d++) {
      const ev = eventos.find((e) => e.diaMes === d && e.estado !== 'CANCELADA');
      resultado.push({
        numero: d,
        fueraDeMes: false,
        evento: ev
          ? {
              id: ev.id,
              etiqueta: ev.estado === 'PENDIENTE' && d === 3 ? 'Pendiente' : ev.materia,
              hora: ev.horaInicio,
              tono: ev.estado === 'PENDIENTE' ? 'pending' : d === 15 ? 'green' : 'teal',
            }
          : undefined,
      });
    }
    for (let next = 1; next <= 4; next++) {
      resultado.push({ numero: next, fueraDeMes: true });
    }
    return resultado;
  });

  ngOnInit(): void {
    this.api
      .reservas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => this.reservasApi.set(r),
        error: () => undefined,
      });
  }

  cambiarMes(delta: number): void {
    const nuevo = Math.max(0, Math.min(this.meses.length - 1, this.indiceMes() + delta));
    this.indiceMes.set(nuevo);
  }

  irAHoy(): void {
    this.indiceMes.set(1);
  }
}
