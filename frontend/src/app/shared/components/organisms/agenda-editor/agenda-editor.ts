import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AgendaApi, ApiService, mensajeHttp } from '../../../../core/services/api.service';
import { CommonModule } from '@angular/common';
import { LucideIconComponent } from '../../atoms/lucide-icon/lucide-icon';

@Component({
  selector: 'app-agenda-editor',
  imports: [CommonModule, FormsModule, LucideIconComponent],
  templateUrl: './agenda-editor.html',
  styleUrl: './agenda-editor.css',
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
