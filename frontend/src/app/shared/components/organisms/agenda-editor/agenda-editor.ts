import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AgendaApi, ApiService, mensajeHttp } from '../../../../core/services/api.service';
@Component({
  selector: 'app-agenda-editor',
  imports: [FormsModule],
  template: ` <section class="myt-surface-card">
    <h2>Mi disponibilidad y bloqueos</h2>
    <p>
      Configura tus horarios semanales para recibir reservas. Los cambios que afecten reservas
      activas se rechazarán.
    </p>
    @if (cargando()) {
      <p role="status">Cargando agenda…</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button type="button" (click)="cargar()">Reintentar consulta</button>
    }
    @if (mensaje()) {
      <p role="status">{{ mensaje() }}</p>
    }
    @if (!cargando() && lista()) {
      <form #form="ngForm" (ngSubmit)="form.valid && guardar()">
        <fieldset [disabled]="guardando()">
          <h3>Disponibilidad semanal</h3>
          @for (h of agenda.horarios; track $index; let i = $index) {
            <div class="myt-form-row-2">
              <label class="form-field"
                >Día<select [name]="'dia' + i" [(ngModel)]="h.diaSemana" required>
                  @for (d of dias; track d) {
                    <option>{{ d }}</option>
                  }
                </select></label
              >
              <label class="form-field"
                >Inicio<input type="time" [name]="'inicio' + i" [(ngModel)]="h.horaInicio" required
              /></label>
              <label class="form-field"
                >Fin<input type="time" [name]="'fin' + i" [(ngModel)]="h.horaFin" required
              /></label>
              <button type="button" (click)="agenda.horarios.splice(i, 1)">Eliminar horario</button>
            </div>
          } @empty {
            <p>No has configurado disponibilidad.</p>
          }
          <button type="button" class="myt-btn myt-btn--secondary" (click)="agregarHorario()">
            Añadir horario
          </button>
          <h3>Bloqueos de agenda</h3>
          @for (b of agenda.bloqueos; track $index; let i = $index) {
            <div class="myt-form-row-2">
              <label class="form-field"
                >Fecha<input type="date" [name]="'fechaB' + i" [(ngModel)]="b.fecha" required
              /></label>
              <label class="form-field"
                >Inicio<input
                  type="time"
                  [name]="'inicioB' + i"
                  [(ngModel)]="b.horaInicio"
                  required
              /></label>
              <label class="form-field"
                >Fin<input type="time" [name]="'finB' + i" [(ngModel)]="b.horaFin" required
              /></label>
              <label class="form-field"
                >Motivo<input [name]="'motivoB' + i" [(ngModel)]="b.motivo" maxlength="300"
              /></label>
              <button type="button" (click)="agenda.bloqueos.splice(i, 1)">Eliminar bloqueo</button>
            </div>
          } @empty {
            <p>No tienes bloqueos registrados.</p>
          }
          <button type="button" class="myt-btn myt-btn--secondary" (click)="agregarBloqueo()">
            Añadir bloqueo
          </button>
          <button class="myt-btn myt-btn--primary" [disabled]="form.invalid || guardando()">
            {{ guardando() ? 'Guardando…' : 'Guardar agenda' }}
          </button>
        </fieldset>
      </form>
    }
  </section>`,
})
export class AgendaEditorComponent implements OnInit {
  readonly tutorId = input.required<number>();
  readonly api = inject(ApiService);
  readonly destroyRef = inject(DestroyRef);
  readonly dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly lista = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  agenda: AgendaApi = { horarios: [], bloqueos: [] };
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.api
      .agenda(this.tutorId())
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (a) => {
          this.agenda = a;
          this.lista.set(true);
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
  agregarHorario() {
    this.agenda.horarios.push({ diaSemana: 'LUNES', horaInicio: '09:00', horaFin: '18:00' });
  }
  agregarBloqueo() {
    this.agenda.bloqueos.push({ fecha: '', horaInicio: '09:00', horaFin: '10:00', motivo: '' });
  }
  guardar() {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.api
      .guardarAgenda(this.tutorId(), this.agenda)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (a) => {
          this.agenda = a;
          this.mensaje.set('Agenda guardada.');
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
}
