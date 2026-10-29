import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, merge, Subject, switchMap, timer } from 'rxjs';
import { ApiService, mensajeHttp } from '../../core/services/api.service';
import { EstudianteRegistro } from '../../core/services/myt-state.service';

@Component({
  selector: 'app-estudiantes-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="myt-page-shell" aria-label="Directorio de estudiantes">
      <header class="myt-page-header">
        <div>
          <h1>Estudiantes</h1>
          <p>Consulta la información académica de los estudiantes.</p>
        </div>
        <div class="myt-header-filters" style="display: flex; gap: 0.5rem; align-items: center;">
          <input
            type="search"
            [ngModel]="filtro()"
            (ngModelChange)="filtro.set($event)"
            placeholder="Filtrar por nombre, código o programa…"
            aria-label="Filtrar estudiantes"
          />
          <button
            type="button"
            class="myt-btn myt-btn--secondary myt-btn--sm"
            (click)="cargarEstudiantes()"
          >
            Actualizar
          </button>
        </div>
      </header>

      @if (cargando()) {
        <p role="status">Cargando estudiantes…</p>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (!cargando() && !error()) {
        <div class="myt-table-scroll" role="region" aria-label="Tabla de estudiantes" tabindex="0">
          <table class="myt-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Nombre</th>
                <th scope="col">Código</th>
                <th scope="col">Universidad</th>
                <th scope="col">Programa</th>
                <th scope="col">Semestre</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (estudiante of estudiantesFiltrados(); track estudiante.id) {
                <tr>
                  <td>{{ estudiante.id }}</td>
                  <td>
                    <strong>{{ estudiante.nombreCompleto }}</strong>
                    <div class="myt-subtle-text">{{ estudiante.correo }}</div>
                  </td>
                  <td>{{ estudiante.codigoEstudiantil }}</td>
                  <td>{{ estudiante.universidad }}</td>
                  <td>{{ estudiante.programaAcademico }}</td>
                  <td>{{ estudiante.semestre }}</td>
                  <td>
                    <span
                      class="myt-status-pill"
                      [class.myt-status-pill--active]="estudiante.activo"
                      [class.myt-status-pill--inactive]="!estudiante.activo"
                    >
                      {{ estudiante.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7">No hay estudiantes registrados para este criterio.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </main>
  `,
  styles: [
    `
      .myt-page-shell {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .myt-page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .myt-page-header h1 {
        margin: 0 0 0.2rem;
        font-size: 1.75rem;
        color: #46494c;
      }
      .myt-page-header p {
        margin: 0;
        color: #4c5c68;
        font-size: 0.92rem;
      }
      .myt-header-filters input {
        min-width: 280px;
        padding: 0.65rem 0.95rem;
        border-radius: 12px;
        border: 1px solid #c5c3c6;
        background: #ffffff;
        color: #46494c;
      }
      .myt-subtle-text {
        font-size: 0.78rem;
        color: #6f7479;
      }
    `,
  ],
})
export class EstudiantesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly filtro = signal('');
  readonly registros = signal<EstudianteRegistro[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  private readonly refrescar = new Subject<void>();
  readonly estudiantesFiltrados = computed(() => {
    const q = this.filtro().toLowerCase().trim();
    return this.registros().filter((e) =>
      [e.nombreCompleto, e.codigoEstudiantil, e.universidad, e.programaAcademico].some((v) =>
        (v ?? '').toLowerCase().includes(q),
      ),
    );
  });
  ngOnInit() {
    merge(timer(0, 15000), this.refrescar)
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
