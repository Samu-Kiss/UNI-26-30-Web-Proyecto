import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Usuario } from '../../core/models/usuario.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, merge, startWith, Subject, switchMap, timer } from 'rxjs';
import { mensajeHttp } from '../../core/services/api.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';

@Component({
  selector: 'app-administradores-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconComponent, AvatarComponent],
  templateUrl: './administradores-page.html',
  styleUrl: './administradores-page.css',
})
export class AdministradoresPageComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly filtro = signal('');
  readonly administradores = signal<Usuario[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  private readonly refrescar = new Subject<void>();

  readonly totalActivos = computed(() => this.administradores().filter((a) => a.activo).length);
  readonly totalInactivos = computed(() => this.administradores().filter((a) => !a.activo).length);

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

  ngOnInit(): void {
    merge(this.refrescar.pipe(startWith(undefined)), timer(15000, 15000))
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

  cargarAdministradores(): void {
    this.refrescar.next();
  }
}
