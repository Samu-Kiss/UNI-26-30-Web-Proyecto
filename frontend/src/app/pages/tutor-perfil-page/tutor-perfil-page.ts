import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  firstValueFrom,
  catchError,
  EMPTY,
  finalize,
  forkJoin,
  merge,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
import { ApiService, AgendaApi, ResenaApi, TutorApi, mensajeHttp } from '../../core/services/api.service';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';
import { AuthService } from '../../core/services/auth.service';
import { AgendaEditorComponent } from '../../shared/components/organisms/agenda-editor/agenda-editor';
import { CalendarioDisponibilidadComponent } from '../../shared/components/molecules/calendario-disponibilidad/calendario-disponibilidad';
import { of } from 'rxjs';

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
  selector: 'app-tutor-perfil-page',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AgendaEditorComponent,
    CalendarioDisponibilidadComponent,
    AvatarComponent,
    LucideIconComponent,
  ],
  templateUrl: './tutor-perfil-page.html',
  styleUrl: './tutor-perfil-page.css',
})
export class TutorPerfilPageComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly route = inject(ActivatedRoute);
  readonly destroyRef = inject(DestroyRef);
  readonly tutorApi = signal<TutorApi | null>(null);
  readonly resenas = signal<ResenaApi[]>([]);
  readonly agenda = signal<AgendaApi | null>(null);
  readonly cargando = signal(true);
  readonly cargandoDisponibilidad = signal(true);
  readonly error = signal('');
  readonly proxima = signal('');
  readonly hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
  readonly fechaSeleccionada = signal('');
  readonly inicioFechas = signal(this.hoy);
  readonly horarios = signal<string[]>([]);
  readonly horaSeleccionada = signal('');
  readonly errorDisponibilidad = signal('');
  private consultaDisponibilidad = 0;

  readonly fechasConsulta = computed(() => {
    const ag = this.agenda();
    const baseDateStr = this.fechaSeleccionada() || this.inicioFechas() || this.hoy;
    const baseDate = new Date(baseDateStr + 'T12:00:00');
    const targetMonth = baseDate.getMonth();
    const targetYear = baseDate.getFullYear();

    const disponibles: string[] = [];
    const minTime = new Date(this.hoy + 'T12:00:00').getTime();
    const monthStart = new Date(targetYear, targetMonth, 1, 12).getTime();
    const startDate = new Date(Math.max(minTime, monthStart));

    for (let i = 0; i < 35; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);

      // Strictly stop once we leave the target month so no days of another month leak in
      if (d.getMonth() !== targetMonth) {
        break;
      }

      const str = d.toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
      const diaSemana = DIAS_MAP[d.getDay()];
      let atiende = true;
      let bloqueado = false;
      if (ag && ag.horarios && ag.horarios.length > 0) {
        atiende = ag.horarios.some((h) => h.diaSemana === diaSemana);
        bloqueado = ag.bloqueos?.some((b) => b.fecha === str) ?? false;
      }

      if (atiende && !bloqueado && str >= this.hoy) {
        disponibles.push(str);
        if (disponibles.length >= 4) break;
      }
    }
    return disponibles;
  });

  readonly esPropietario = computed(
    () =>
      this.auth.sesion()?.rol === 'TUTOR' && this.auth.sesion()?.perfilId === this.tutorApi()?.id,
  );
  private readonly refrescar = new Subject<void>();
  ngOnInit() {
    merge(timer(0, 30000), this.refrescar, this.api.cambios)
      .pipe(
        switchMap(() => {
          this.cargando.set(true);
          this.error.set('');
          const id = Number(this.route.snapshot.paramMap.get('id'));
          const ag$ = this.api.agenda ? this.api.agenda(id).pipe(catchError(() => of(null))) : of(null);
          return forkJoin({ t: this.api.tutor(id), r: this.api.resenas(id), ag: ag$ }).pipe(
            catchError((e) => {
              this.error.set(mensajeHttp(e));
              this.tutorApi.set(null);
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ t, r, ag }) => {
        this.tutorApi.set(t);
        this.resenas.set(r);
        if (ag) this.agenda.set(ag);
        if (this.fechaSeleccionada()) void this.seleccionarFecha(this.fechaSeleccionada());
        else void this.buscarProxima(t.id);
      });
  }
  cargar() {
    this.refrescar.next();
  }
  async seleccionarFecha(fecha: string) {
    const id = this.tutorApi()?.id;
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < this.hoy) return;
    const consulta = ++this.consultaDisponibilidad;
    this.fechaSeleccionada.set(fecha);
    this.inicioFechas.set(fecha);
    this.horaSeleccionada.set('');
    this.horarios.set([]);
    this.cargandoDisponibilidad.set(true);
    this.errorDisponibilidad.set('');
    try {
      const horas = await firstValueFrom(
        this.api.horas(id, fecha, 60).pipe(takeUntilDestroyed(this.destroyRef)),
      );
      if (consulta === this.consultaDisponibilidad && !this.destroyRef.destroyed)
        this.horarios.set(horas);
    } catch (e) {
      if (consulta === this.consultaDisponibilidad && !this.destroyRef.destroyed)
        this.errorDisponibilidad.set(mensajeHttp(e));
    } finally {
      if (consulta === this.consultaDisponibilidad && !this.destroyRef.destroyed)
        this.cargandoDisponibilidad.set(false);
    }
  }
  private async buscarProxima(id: number) {
    const consulta = ++this.consultaDisponibilidad;
    this.errorDisponibilidad.set('');
    this.cargandoDisponibilidad.set(true);
    this.proxima.set('');
    try {
      const ag = this.agenda();
      for (let i = 0; i < 30; i++) {
        const d = new Date(
          new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' }) + 'T12:00:00',
        );
        d.setDate(d.getDate() + i);
        const fecha = d.toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
        if (ag && ag.horarios && ag.horarios.length > 0) {
          const diaSemana = DIAS_MAP[d.getDay()];
          const atiende = ag.horarios.some((h) => h.diaSemana === diaSemana);
          const bloqueado = ag.bloqueos?.some((b) => b.fecha === fecha);
          if (!atiende || bloqueado) continue;
        }
        const horas = await firstValueFrom(
          this.api.horas(id, fecha, 60).pipe(takeUntilDestroyed(this.destroyRef)),
        );
        if (consulta !== this.consultaDisponibilidad || this.destroyRef.destroyed) return;
        if (horas.length) {
          this.fechaSeleccionada.set(fecha);
          this.inicioFechas.set(fecha);
          this.horarios.set(horas);
          this.proxima.set(fecha + ' · ' + horas[0].slice(0, 5));
          break;
        }
      }
    } catch (e) {
      if (consulta === this.consultaDisponibilidad && !this.destroyRef.destroyed)
        this.errorDisponibilidad.set(mensajeHttp(e));
    } finally {
      if (consulta === this.consultaDisponibilidad && !this.destroyRef.destroyed)
        this.cargandoDisponibilidad.set(false);
    }
  }
}
