import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { EstudianteRegistro, MytStateService } from '../../core/services/myt-state.service';
import { UsuarioService } from '../../core/services/usuario.service';

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
  private readonly usuarioService = inject(UsuarioService);
  private readonly auth = inject(AuthService);
  private readonly state = inject(MytStateService);

  readonly filtro = signal('');
  readonly registros = signal<EstudianteRegistro[]>(this.state.estudiantesBase());

  readonly estudiantesFiltrados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    const lista = this.registros();
    if (!q) {
      return lista;
    }
    return lista.filter(
      (e) =>
        e.nombreCompleto.toLowerCase().includes(q) ||
        e.codigoEstudiantil.toLowerCase().includes(q) ||
        e.universidad.toLowerCase().includes(q) ||
        e.programaAcademico.toLowerCase().includes(q),
    );
  });

  private readonly api = inject(ApiService);

  ngOnInit(): void {
    this.cargarEstudiantes();
  }

  cargarEstudiantes(): void {
    const base = this.state.estudiantesBase();
    this.api.estudiantes().subscribe({
      next: (estudiantes) => {
        const mapa = new Map<string, EstudianteRegistro>();
        for (const e of base) {
          mapa.set(e.correo.toLowerCase(), { ...e });
        }
        if (estudiantes && estudiantes.length > 0) {
          for (const e of estudiantes) {
            const correoKey = (e.correo || '').toLowerCase();
            const existente = mapa.get(correoKey);
            if (existente) {
              existente.id = e.id;
              existente.usuarioId = e.usuarioId;
              existente.nombreCompleto = e.nombreCompleto || existente.nombreCompleto;
              if (e.codigoEstudiantil) existente.codigoEstudiantil = e.codigoEstudiantil;
              if (e.universidad) existente.universidad = e.universidad;
              if (e.programaAcademico) existente.programaAcademico = e.programaAcademico;
              if (e.semestre != null) existente.semestre = e.semestre;
              existente.activo = e.activo;
            } else {
              mapa.set(correoKey, {
                id: e.id,
                usuarioId: e.usuarioId,
                nombreCompleto: e.nombreCompleto,
                correo: e.correo,
                codigoEstudiantil: e.codigoEstudiantil || 'No disponible',
                universidad: e.universidad || 'No disponible',
                programaAcademico: e.programaAcademico || 'No disponible',
                semestre: e.semestre ?? 1,
                activo: e.activo,
              });
            }
          }
        }
        this.registros.set(Array.from(mapa.values()));
        this.sincronizarConUsuarios();
      },
      error: () => {
        this.sincronizarConUsuarios();
      },
    });
  }

  private sincronizarConUsuarios(): void {
    this.usuarioService.obtenerUsuarios().subscribe({
      next: (usuarios) => {
        const estudiantesUsuarios = usuarios.filter((u) => u.roles.includes('ESTUDIANTE'));
        if (estudiantesUsuarios.length === 0) return;
        const actuales = this.registros();
        const combinados = [...actuales];
        for (const u of estudiantesUsuarios) {
          const existe = combinados.some(
            (c) => c.usuarioId === u.id || c.correo.toLowerCase() === u.correo.toLowerCase(),
          );
          if (!existe) {
            combinados.push({
              id: u.id,
              usuarioId: u.id,
              nombreCompleto: `${u.nombre} ${u.apellido}`,
              correo: u.correo,
              codigoEstudiantil: 'EST-2026-' + u.id,
              universidad: 'Pontificia Universidad Javeriana',
              programaAcademico: 'Ingeniería de Sistemas',
              semestre: 1,
              activo: u.activo,
            });
          }
        }
        this.registros.set(combinados);
      },
      error: () => undefined,
    });
  }
}
