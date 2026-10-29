import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Usuario } from '../../core/models/usuario.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, switchMap, timer } from 'rxjs';
import { mensajeHttp } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioService } from '../../core/services/usuario.service';

@Component({
  selector: 'app-administradores-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="myt-page-shell" aria-label="Directorio de administradores">
      <header class="myt-page-header">
        <div>
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

      @if (cargando()) {
        <p role="status">Cargando administradores…</p>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (!cargando() && !error()) {
        <div
          class="myt-table-scroll"
          role="region"
          aria-label="Tabla de administradores"
          tabindex="0"
        >
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
                  <td>
                    <strong>{{ admin.nombre }} {{ admin.apellido }}</strong>
                  </td>
                  <td>{{ admin.correo }}</td>
                  <td>{{ admin.telefono || '—' }}</td>
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
        min-width: 260px;
        padding: 0.65rem 0.95rem;
        border-radius: 12px;
        border: 1px solid #c5c3c6;
        background: #ffffff;
        color: #46494c;
      }
    `,
  ],
})
export class AdministradoresPageComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly auth = inject(AuthService);

  readonly filtro = signal('');
  readonly administradores = signal<Usuario[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  readonly administradoresFiltrados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    const lista = this.administradores();
    if (!q) {
      return lista;
    }
    return lista.filter(
      (a) =>
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(q) || a.correo.toLowerCase().includes(q),
    );
  });

  private readonly destroyRef = inject(DestroyRef);
  ngOnInit(): void {
    timer(0, 15000)
      .pipe(
        switchMap(() => {
          this.cargando.set(true);
          this.error.set('');
          return this.usuarioService.obtenerUsuarios().pipe(
            catchError((e) => {
              this.administradores.set([]);
              this.error.set(mensajeHttp(e));
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((u) =>
        this.administradores.set(u.filter((x) => x.roles.includes('ADMINISTRADOR'))),
      );
  }
}
