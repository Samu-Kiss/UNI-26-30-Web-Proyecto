import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EstudianteRegistro, MytStateService } from '../../core/services/myt-state.service';
import { UsuarioService } from '../../core/services/usuario.service';

@Component({
  selector: 'app-estudiantes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="myt-page-shell" aria-label="Directorio de estudiantes">
      <header class="myt-page-header">
        <div>
          <a routerLink="/menu" class="myt-back-link">← Volver al menú</a>
          <h1>Estudiantes</h1>
          <p>Consulta la información académica de los estudiantes.</p>
        </div>
        <div class="myt-header-filters">
          <input
            type="search"
            [ngModel]="filtro()"
            (ngModelChange)="filtro.set($event)"
            placeholder="Filtrar por nombre, código o programa…"
            aria-label="Filtrar estudiantes"
          />
        </div>
      </header>

      <section class="myt-card">
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
      </section>
    </main>
  `,
  styles: [
    `
      .myt-page-shell {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .myt-page-header {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 18px;
        padding: 1.5rem 1.75rem;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .myt-back-link {
        font-size: 0.82rem;
        font-weight: 700;
        color: #1985a1;
        text-decoration: none;
      }
      .myt-page-header h1 {
        margin: 0.35rem 0 0.2rem;
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
      .myt-card {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 18px;
        padding: 1.25rem;
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

  ngOnInit(): void {
    this.usuarioService.obtenerUsuarios().subscribe({
      next: (usuarios) => {
        const deApi: EstudianteRegistro[] = usuarios
          .filter((u) => u.roles.includes('ESTUDIANTE'))
          .map((u, idx) => ({
            id: u.id,
            usuarioId: u.id,
            nombreCompleto: `${u.nombre} ${u.apellido}`,
            correo: u.correo,
            codigoEstudiantil: `202610${u.id}`,
            universidad:
              idx % 2 === 0
                ? 'Pontificia Universidad Javeriana'
                : 'Universidad de los Andes',
            programaAcademico:
              idx % 2 === 0 ? 'Ingeniería de Sistemas' : 'Matemáticas Aplicadas',
            semestre: (idx % 8) + 2,
            activo: u.activo,
          }));
        if (deApi.length > 0) {
          this.registros.set(deApi);
        }
      },
      error: () => {
        // Mantiene semilla local si el backend no está activo
      },
    });
  }
}
