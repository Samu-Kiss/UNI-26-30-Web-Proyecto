import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, merge, startWith, Subject, switchMap, timer } from 'rxjs';
import { ApiService, mensajeHttp } from '../../core/services/api.service';
import { EstudianteRegistro } from '../../core/services/myt-state.service';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';

@Component({
  selector: 'app-estudiantes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconComponent, AvatarComponent],
  templateUrl: './estudiantes-page.html',
  styleUrl: './estudiantes-page.css',
})
export class EstudiantesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly filtro = signal('');
  readonly registros = signal<EstudianteRegistro[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  private readonly refrescar = new Subject<void>();

  readonly totalActivos = computed(() => this.registros().filter((e) => e.activo).length);
  readonly totalInactivos = computed(() => this.registros().filter((e) => !e.activo).length);

  readonly estudiantesFiltrados = computed(() => {
    const q = this.filtro().toLowerCase().trim();
    return this.registros().filter((e) =>
      [e.nombreCompleto, e.codigoEstudiantil, e.universidad, e.programaAcademico].some((v) =>
        (v ?? '').toLowerCase().includes(q),
      ),
    );
  });

  ngOnInit() {
    merge(this.refrescar.pipe(startWith(undefined)), timer(15000, 15000))
      .pipe(
        switchMap(() => {
          this.cargando.set(true);
          this.error.set('');
          return this.api.estudiantes().pipe(
            catchError((e) => {
              this.registros.set([]);
              this.error.set(mensajeHttp(e));
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => this.registros.set(e));
  }

  cargarEstudiantes() {
    this.refrescar.next();
  }
}
