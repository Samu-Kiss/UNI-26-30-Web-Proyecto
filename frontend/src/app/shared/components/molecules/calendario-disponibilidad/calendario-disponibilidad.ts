import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AgendaApi, ApiService } from '../../../../core/services/api.service';
import { LucideIconComponent } from '../../atoms/lucide-icon/lucide-icon';

export interface DiaCelda {
  numero: number;
  fecha: string;
  disponible: boolean;
  seleccionado: boolean;
  esHoy: boolean;
}

const DIAS_MAP: Record<number, string> = {
  0: 'DOMINGO',
  1: 'LUNES',
  2: 'MARTES',
  3: 'MIERCOLES',
  4: 'JUEVES',
  5: 'VIERNES',
  6: 'SABADO',
};

@Component({
  selector: 'app-calendario-disponibilidad',
  standalone: true,
  imports: [CommonModule, LucideIconComponent],
  templateUrl: './calendario-disponibilidad.html',
  styleUrl: './calendario-disponibilidad.css',
})
export class CalendarioDisponibilidadComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tutorId = input<number>(0);
  readonly fecha = input<string>('');
  readonly minFecha = input<string>('');
  readonly agendaInput = input<AgendaApi | null>(null, { alias: 'agenda' });

  readonly fechaChange = output<string>();

  readonly hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
  readonly agendaInterna = signal<AgendaApi | null>(null);

  readonly agendaActual = computed(() => this.agendaInput() ?? this.agendaInterna());

  readonly mesVisual = signal<Date>(
    new Date(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' }) + 'T12:00:00'),
  );

  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  readonly mesTexto = computed(() => {
    const d = this.mesVisual();
    return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  });

  readonly diasMes = computed<(DiaCelda | null)[]>(() => {
    const d = this.mesVisual();
    const year = d.getFullYear();
    const month = d.getMonth();
    const inicio = new Date(year, month, 1);
    const offset = (inicio.getDay() + 6) % 7; // Lunes = 0
    const total = new Date(year, month + 1, 0).getDate();
    const min = this.minFecha() || this.hoy;
    const ag = this.agendaActual();
    const sel = this.fecha();

    const resultado: (DiaCelda | null)[] = Array.from({ length: offset }, () => null);

    for (let n = 1; n <= total; n++) {
      const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      const fechaDate = new Date(fechaStr + 'T12:00:00');
      const diaSemanaNombre = DIAS_MAP[fechaDate.getDay()];

      let disponible = false;
      if (fechaStr >= min) {
        if (ag && ag.horarios && ag.horarios.length > 0) {
          const atiende = ag.horarios.some((h) => h.diaSemana === diaSemanaNombre);
          const bloqueado = ag.bloqueos?.some((b) => b.fecha === fechaStr) ?? false;
          disponible = atiende && !bloqueado;
        } else {
          // Si no hay agenda específica cargada, los días a futuro se permiten
          disponible = true;
        }
      }

      resultado.push({
        numero: n,
        fecha: fechaStr,
        disponible,
        seleccionado: fechaStr === sel,
        esHoy: fechaStr === this.hoy,
      });
    }

    return resultado;
  });

  constructor() {
    effect(() => {
      const f = this.fecha();
      if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        const d = new Date(f + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          const cur = untracked(() => this.mesVisual());
          if (cur.getFullYear() !== d.getFullYear() || cur.getMonth() !== d.getMonth()) {
            this.mesVisual.set(d);
          }
        }
      }
    });

    effect(() => {
      const id = this.tutorId();
      if (id > 0 && !this.agendaInput() && this.api?.agenda) {
        this.api
          .agenda(id)
          .pipe(
            catchError(() => of(null)),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe((ag) => {
            if (ag) this.agendaInterna.set(ag);
          });
      }
    });
  }

  ngOnInit() {
    const f = this.fecha();
    if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
      const d = new Date(f + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        this.mesVisual.set(d);
      }
    }
  }

  cambiarMes(delta: number) {
    const d = new Date(this.mesVisual());
    d.setDate(1);
    d.setMonth(d.getMonth() + delta);
    this.mesVisual.set(d);
  }

  seleccionar(celda: DiaCelda | null) {
    if (!celda || !celda.disponible) return;
    this.fechaChange.emit(celda.fecha);
  }
}
