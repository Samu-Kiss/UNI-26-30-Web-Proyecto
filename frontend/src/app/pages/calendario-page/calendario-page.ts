import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiService, ReservaApi } from '../../core/services/api.service';
import { MytStateService } from '../../core/services/myt-state.service';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';

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
  imports: [RouterLink, LucideIconComponent],
  template: `
    <main class="myt-screen" data-node-id="1:1036">
      <header class="myt-page-header" data-node-id="10:110">
        <div>
          <h1>Mi calendario</h1>
          <p>Consulta tus sesiones programadas, pendientes y pasadas.</p>
        </div>
        <a routerLink="/tutores" class="myt-btn myt-btn--primary">
          <app-lucide-icon name="search" [size]="16" />
          <span>Buscar tutor</span>
        </a>
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
            <div class="myt-calendar-board__controls">
              <button type="button" class="myt-link-btn" aria-label="Mes anterior" (click)="cambiarMes(-1)">
                <app-lucide-icon name="chevron-left" [size]="16" />
              </button>
              <button type="button" class="myt-link-btn" (click)="irAHoy()">Hoy</button>
              <button type="button" class="myt-link-btn" aria-label="Mes siguiente" (click)="cambiarMes(1)">
                <app-lucide-icon name="chevron-right" [size]="16" />
              </button>
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
                  <div class="myt-upcoming-item__body">
                    <strong>{{ ev.titulo }}</strong>
                    <small>
                      {{ ev.horaInicio }} ·
                      {{ ev.modalidad === 'En línea' ? 'Online' : 'Presencial' }}
                    </small>
                  </div>
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
  styles: [
    `
      .myt-screen {
        display: flex;
        flex-direction: column;
        gap: 1.35rem;
        max-width: 1160px;
        margin: 0 auto;
      }
      .myt-page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .myt-page-header h1 {
        font-size: 1.85rem;
        color: #46494c;
        margin: 0;
      }
      .myt-page-header p {
        margin: 0.25rem 0 0;
        color: #4c5c68;
      }
      .myt-kpi-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
      }
      @media (max-width: 680px) {
        .myt-kpi-row {
          grid-template-columns: 1fr;
        }
      }
      .myt-kpi-card {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 16px;
        padding: 1.15rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
      .myt-kpi-card strong {
        font-size: 1.65rem;
        color: #1985a1;
      }
      .myt-kpi-card span {
        font-size: 0.82rem;
        font-weight: 600;
        color: #4c5c68;
      }
      .myt-calendar-layout {
        display: grid;
        grid-template-columns: 1.85fr 1fr;
        gap: 1.35rem;
        align-items: start;
      }
      @media (max-width: 980px) {
        .myt-calendar-layout {
          grid-template-columns: 1fr;
        }
      }
      .myt-paper-card {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 18px;
        padding: 1.5rem;
      }
      .myt-calendar-board__top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .myt-calendar-board__controls {
        display: flex;
        gap: 0.4rem;
      }
      .myt-link-btn {
        background: #ffffff;
        border: 1px solid #c5c3c6;
        border-radius: 8px;
        padding: 0.3rem 0.65rem;
        font-size: 0.82rem;
        font-weight: 700;
        color: #46494c;
        cursor: pointer;
      }
      .myt-calendar-weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        font-size: 0.72rem;
        font-weight: 700;
        color: #6f7479;
        padding-bottom: 0.5rem;
      }
      .myt-calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0.45rem;
      }
      .myt-calendar-cell {
        min-height: 86px;
        background: #ffffff;
        border: 1px solid #e4e4e5;
        border-radius: 12px;
        padding: 0.45rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .myt-calendar-cell--muted {
        background: #e9e9ea;
        opacity: 0.6;
      }
      .myt-calendar-cell__day {
        font-size: 0.75rem;
        font-weight: 700;
        color: #4c5c68;
      }
      .myt-calendar-event {
        display: flex;
        flex-direction: column;
        padding: 0.3rem 0.45rem;
        border-radius: 8px;
        text-decoration: none;
        font-size: 0.7rem;
        line-height: 1.2;
      }
      .myt-calendar-event--teal,
      .myt-calendar-event--teal:hover {
        background: #126e87;
        color: #ffffff;
        text-decoration: none;
      }
      .myt-calendar-event--green,
      .myt-calendar-event--green:hover {
        background: #0d695b;
        color: #ffffff;
        text-decoration: none;
      }
      .myt-calendar-event--pending,
      .myt-calendar-event--pending:hover {
        background: #fef0c7;
        color: #694100;
        border: 1px solid #f0a726;
        text-decoration: none;
      }
      .myt-upcoming-panel {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .myt-upcoming-list {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .myt-upcoming-item {
        background: #ffffff;
        border: 1px solid #dcdcdd;
        border-radius: 12px;
        padding: 0.75rem 0.9rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-decoration: none;
        color: #46494c;
      }
      .myt-upcoming-item:hover {
        border-color: #1985a1;
        text-decoration: none;
      }
      .myt-upcoming-item__date {
        padding: 0.35rem 0.55rem;
        border-radius: 8px;
        background: #ddecef;
        color: #1985a1;
        font-size: 0.7rem;
        font-weight: 800;
        white-space: nowrap;
      }
      .myt-upcoming-item__date--amber {
        background: rgba(240, 167, 38, 0.2);
        color: #a96d00;
      }
      .myt-upcoming-item__date--green {
        background: rgba(17, 129, 111, 0.16);
        color: #11816f;
      }
      .myt-upcoming-item__body {
        display: flex;
        flex-direction: column;
      }
      .myt-upcoming-item__body strong {
        font-size: 0.88rem;
      }
      .myt-upcoming-item__body small {
        font-size: 0.76rem;
        color: #6f7479;
      }
      .myt-calendar-legend {
        padding-top: 0.75rem;
        border-top: 1px solid #dcdcdd;
      }
      .myt-calendar-legend h3 {
        font-size: 0.82rem;
        margin-bottom: 0.35rem;
      }
      .myt-calendar-legend p {
        display: flex;
        gap: 0.85rem;
        flex-wrap: wrap;
        font-size: 0.78rem;
      }
      .myt-dot--teal {
        color: #1985a1;
      }
      .myt-dot--amber {
        color: #f0a726;
      }
      .myt-dot--green {
        color: #11816f;
      }
    `,
  ],
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
