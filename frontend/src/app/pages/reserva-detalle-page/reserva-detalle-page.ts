import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MytStateService } from '../../core/services/myt-state.service';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';

@Component({
  selector: 'app-reserva-detalle-page',
  imports: [RouterLink, FormsModule, AvatarComponent],
  template: `
    <main class="myt-screen" data-node-id="1:1037">
      <a routerLink="/calendario" class="myt-back-link">← Volver al calendario</a>

      <header class="myt-page-header" data-node-id="12:114">
        <div>
          <h1>Detalle de la tutoría</h1>
          <p>Reserva {{ eventoActual().codigo }}</p>
        </div>
        <span
          class="myt-status-pill"
          [class.myt-status-pill--confirmed]="eventoActual().estado === 'CONFIRMADA'"
          [class.myt-status-pill--pending]="eventoActual().estado === 'PENDIENTE'"
          [class.myt-status-pill--danger]="eventoActual().estado === 'CANCELADA'"
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
        <output class="myt-banner-output">{{ aviso() }}</output>
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
              Abrir videollamada
            </a>
            <a routerLink="/mensajes" class="myt-btn myt-btn--neutral">Enviar mensaje</a>
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
              class="myt-btn myt-btn--subtle-danger"
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
