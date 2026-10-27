import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MytStateService } from '../../core/services/myt-state.service';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';

@Component({
  selector: 'app-reserva-detalle-page',
  imports: [RouterLink, FormsModule, AvatarComponent, LucideIconComponent],
  template: `
    <main class="myt-screen" data-node-id="1:1037">
      <a routerLink="/calendario" class="myt-back-link">
        <app-lucide-icon name="arrow-left" [size]="16" />
        <span>Volver al calendario</span>
      </a>

      <header class="myt-page-header" data-node-id="12:114">
        <div>
          <h1>Detalle de la tutoría</h1>
          <p>Reserva {{ eventoActual().codigo }}</p>
        </div>
        <span
          class="myt-status-pill"
          [class.myt-status-pill--active]="eventoActual().estado === 'CONFIRMADA'"
          [class.myt-badge--pending]="eventoActual().estado === 'PENDIENTE'"
          [class.myt-status-pill--inactive]="eventoActual().estado === 'CANCELADA'"
        >
          ●
          @switch (eventoActual().estado) {
            @case ('CONFIRMADA') {
              Confirmada
            }
            @case ('PENDIENTE') {
              Pendiente de confirmación
            }
            @case ('CANCELADA') {
              Cancelada
            }
            @default {
              Completada
            }
          }
        </span>
      </header>

      @if (aviso()) {
        <output class="myt-alert myt-alert--success">{{ aviso() }}</output>
      }

      <div class="myt-detail-grid" data-node-id="12:120">
        <section class="myt-paper-card myt-detail-card" data-node-id="12:121">
          <div class="myt-detail-tutor">
            <app-avatar
              [name]="eventoActual().tutorNombre"
              [initials]="eventoActual().tutorNombre.charAt(0).toUpperCase()"
              size="lg"
            />
            <div>
              <h2>{{ eventoActual().tutorNombre }}</h2>
              <p>{{ eventoActual().tutorSubtitulo }} · ★ {{ eventoActual().tutorCalificacion }}</p>
            </div>
          </div>

          <dl class="myt-kv-box" data-node-id="12:128">
            <div class="myt-kv-row">
              <dt>Tema</dt>
              <dd>{{ eventoActual().tema }}</dd>
            </div>
            <div class="myt-kv-row">
              <dt>Fecha</dt>
              <dd>{{ eventoActual().fechaLarga }}</dd>
            </div>
            <div class="myt-kv-row">
              <dt>Hora</dt>
              <dd>{{ eventoActual().rangoHora }}</dd>
            </div>
            <div class="myt-kv-row">
              <dt>Duración</dt>
              <dd>{{ eventoActual().duracionMinutos }} minutos</dd>
            </div>
            <div class="myt-kv-row">
              <dt>Modalidad</dt>
              <dd>{{ eventoActual().modalidad }}</dd>
            </div>
            <div class="myt-kv-row">
              <dt>Enlace</dt>
              <dd class="myt-kv-link">{{ eventoActual().enlace }}</dd>
            </div>
          </dl>

          <div class="myt-detail-message">
            <h3>Mensaje inicial</h3>
            <p>{{ eventoActual().mensajeInicial }}</p>
          </div>

          <div class="myt-button-row">
            <a
              class="myt-btn myt-btn--primary"
              [href]="'https://' + eventoActual().enlace.trim()"
              target="_blank"
              rel="noopener noreferrer"
            >
              <app-lucide-icon name="video" [size]="16" />
              <span>Abrir videollamada</span>
            </a>
            <a routerLink="/mensajes" class="myt-btn myt-btn--secondary">
              <app-lucide-icon name="message-square" [size]="16" />
              <span>Enviar mensaje</span>
            </a>
          </div>
        </section>

        <section class="myt-paper-card myt-reschedule-card" data-node-id="12:166">
          <h2>Reprogramar tutoría</h2>
          <p class="myt-reschedule-lead">
            Propón un nuevo horario. {{ eventoActual().tutorNombre.split(' ')[0] }} deberá aprobar
            el cambio.
          </p>

          <form class="myt-form-stack" (ngSubmit)="proponerHorario()">
            <fieldset class="myt-date-split">
              <legend class="form-label">Nueva fecha</legend>
              <div class="myt-date-split__inputs">
                <input
                  class="text-input"
                  type="text"
                  name="dia"
                  [(ngModel)]="diaNuevo"
                  aria-label="Día"
                  placeholder="DD"
                />
                <input
                  class="text-input"
                  type="text"
                  name="mes"
                  [(ngModel)]="mesNuevo"
                  aria-label="Mes"
                  placeholder="MM"
                />
                <input
                  class="text-input"
                  type="text"
                  name="anio"
                  [(ngModel)]="anioNuevo"
                  aria-label="Año"
                  placeholder="AAAA"
                />
              </div>
            </fieldset>

            <label class="form-field">
              <span class="form-label">Nuevo horario</span>
              <input
                class="text-input"
                type="text"
                name="nuevoHorario"
                [(ngModel)]="nuevoHorario"
                required
              />
            </label>

            <div class="myt-warning-callout" data-node-id="12:185">
              <strong>Importante</strong>
              <p>Los cambios deben solicitarse con al menos 12 horas de anticipación.</p>
            </div>

            <button
              type="submit"
              class="myt-btn myt-btn--primary myt-btn--full"
              [disabled]="eventoActual().estado === 'CANCELADA'"
            >
              Proponer nuevo horario
            </button>

            <button
              type="button"
              class="myt-btn myt-btn--danger myt-btn--full"
              [disabled]="eventoActual().estado === 'CANCELADA'"
              (click)="cancelarTutoria()"
            >
              Cancelar tutoría
            </button>
          </form>
        </section>
      </div>
    </main>
  `,
  styles: [
    `
      .myt-screen {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        max-width: 1120px;
        margin: 0 auto;
      }
      .myt-back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.85rem;
        font-weight: 700;
        color: #1985a1;
        text-decoration: none;
        align-self: flex-start;
      }
      .myt-page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .myt-page-header h1 {
        font-size: 1.8rem;
        color: #46494c;
        margin: 0;
      }
      .myt-detail-grid {
        display: grid;
        grid-template-columns: 1.35fr 1fr;
        gap: 1.5rem;
        align-items: start;
      }
      @media (max-width: 900px) {
        .myt-detail-grid {
          grid-template-columns: 1fr;
        }
      }
      .myt-paper-card {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 18px;
        padding: 1.75rem;
        display: flex;
        flex-direction: column;
        gap: 1.15rem;
      }
      .myt-detail-tutor {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #dcdcdd;
      }
      .myt-detail-tutor h2 {
        margin: 0;
        font-size: 1.2rem;
      }
      .myt-kv-box {
        margin: 0;
        padding: 0.25rem 0;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .myt-kv-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 0.88rem;
        padding-bottom: 0.55rem;
        border-bottom: 1px solid #e4e4e5;
      }
      .myt-kv-row dt {
        color: #6f7479;
      }
      .myt-kv-row dd {
        margin: 0;
        font-weight: 700;
        color: #46494c;
        text-align: right;
      }
      .myt-kv-link {
        color: #1985a1 !important;
      }
      .myt-detail-message {
        padding-top: 0.25rem;
      }
      .myt-detail-message h3 {
        font-size: 0.82rem;
        margin-bottom: 0.3rem;
      }
      .myt-detail-message p {
        font-size: 0.86rem;
      }
      .myt-button-row {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .myt-form-stack {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .myt-date-split {
        border: 0;
        margin: 0;
        padding: 0;
      }
      .myt-date-split__inputs {
        display: grid;
        grid-template-columns: 1fr 1fr 1.3fr;
        gap: 0.6rem;
        margin-top: 0.35rem;
      }
      .myt-warning-callout {
        background: rgba(240, 167, 38, 0.14);
        border: 1px solid #f0a726;
        border-radius: 12px;
        padding: 0.85rem 1rem;
      }
      .myt-warning-callout strong {
        font-size: 0.82rem;
        color: #8c5d00;
      }
      .myt-warning-callout p {
        font-size: 0.8rem;
        color: #8c5d00;
        margin-top: 0.2rem;
      }
    `,
  ],
})
export class ReservaDetallePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly state = inject(MytStateService);

  readonly idReserva = signal(1);
  readonly aviso = signal('');

  diaNuevo = '10';
  mesNuevo = '09';
  anioNuevo = '2026';
  nuevoHorario = '6:00 p. m.';

  readonly eventoActual = computed(() => {
    const id = this.idReserva();
    return (
      this.state.eventosCalendario().find((e) => e.id === id) ?? this.state.eventosCalendario()[0]
    );
  });

  ngOnInit(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('id'));
    if (idParam > 0) {
      this.idReserva.set(idParam);
    }
  }

  proponerHorario(): void {
    const fechaIso = `${this.anioNuevo}-${this.mesNuevo.padStart(2, '0')}-${this.diaNuevo.padStart(2, '0')}`;
    this.state.reprogramarEvento(this.eventoActual().id, fechaIso, this.nuevoHorario);
    this.aviso.set(
      `Propuesta enviada para el ${this.diaNuevo}/${this.mesNuevo}/${this.anioNuevo} a las ${this.nuevoHorario}.`,
    );
  }

  cancelarTutoria(): void {
    this.state.cancelarEvento(this.eventoActual().id);
    this.aviso.set('La tutoría fue marcada como cancelada.');
  }
}
