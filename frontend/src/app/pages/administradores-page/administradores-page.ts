import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Usuario } from '../../core/models/usuario.model';
import { UsuarioService } from '../../core/services/usuario.service';

@Component({
  selector: 'app-administradores-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="myt-page-shell" aria-label="Directorio de administradores">
      <header class="myt-page-header">
        <div>
          <a routerLink="/menu" class="myt-back-link">← Volver al menú</a>
          <h1>Administradores</h1>
          <p>Consulta las cuentas con acceso administrativo.</p>
        </div>
        <div class="myt-header-filters">
          <input
            type="search"
            [ngModel]="filtro()"
            (ngModelChange)="filtro.set($event)"
            placeholder="Filtrar por nombre o correo…"
            aria-label="Filtrar administradores"
          />
        </div>
      </header>

      <section class="myt-card">
        <div class="myt-table-scroll" role="region" aria-label="Tabla de administradores" tabindex="0">
          <table class="myt-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (admin of administradoresFiltrados(); track admin.id) {
                <tr>
                  <td>{{ admin.id }}</td>
                  <td><strong>{{ admin.nombre }} {{ admin.apellido }}</strong></td>
                  <td>{{ admin.correo }}</td>
                  <td>{{ admin.telefono || '300 555 0199' }}</td>
                  <td>
                    <span
                      class="myt-status-pill"
                      [class.myt-status-pill--active]="admin.activo"
                      [class.myt-status-pill--inactive]="!admin.activo"
                    >
                      {{ admin.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">No hay administradores registrados.</td>
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
        min-width: 260px;
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
    `,
  ],
})
export class AdministradoresPageComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);

  readonly filtro = signal('');
  readonly administradores = signal<Usuario[]>([
    {
      id: 1,
      nombre: 'Elena',
      apellido: 'Martínez',
      correo: 'admin.elena@myt.edu.co',
      telefono: '310 450 8821',
      activo: true,
      roles: ['ADMINISTRADOR'],
    },
    {
      id: 2,
      nombre: 'Ricardo',
      apellido: 'Gómez',
      correo: 'ricardo.gomez@myt.edu.co',
      telefono: '315 892 1104',
      activo: true,
      roles: ['ADMINISTRADOR'],
    },
  ]);

  readonly administradoresFiltrados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    const lista = this.administradores();
    if (!q) {
      return lista;
    }
    return lista.filter(
      (a) =>
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(q) ||
        a.correo.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.usuarioService.obtenerUsuarios().subscribe({
      next: (usuarios) => {
        const admins = usuarios.filter((u) => u.roles.includes('ADMINISTRADOR'));
        if (admins.length > 0) {
          this.administradores.set(admins);
        }
      },
      error: () => {
        // Usa semilla local si no hay sesión o backend activo
      },
    });
  }
}
