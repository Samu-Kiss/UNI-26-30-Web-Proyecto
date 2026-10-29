import { toObservable } from '@angular/core/rxjs-interop';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  catchError,
  finalize,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  map,
  merge,
  of,
  shareReplay,
  startWith,
  Subject,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';
import { RegistroUsuario, Usuario } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { mensajeHttp } from '../../core/services/api.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { UsuarioFormComponent } from '../../shared/components/organisms/usuario-form/usuario-form';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';

@Component({
  selector: 'app-usuarios-page',
  imports: [
    CommonModule,
    AsyncPipe,
    FormsModule,
    ReactiveFormsModule,
    UsuarioFormComponent,
    RouterLink,
    AvatarComponent,
    LucideIconComponent,
  ],
  templateUrl: './usuarios-page.html',
  styleUrl: './usuarios-page.css',
})
export class UsuariosPageComponent implements OnInit, OnDestroy {
  private readonly usuarioService = inject(UsuarioService);
  readonly auth = inject(AuthService);
  readonly guardando = signal(false);
  readonly cargando = signal(false);
  readonly guardado = signal('');
  readonly mostrarFormNuevo = signal(false);

  readonly totalUsuarios = computed(() => this.usuarios().length);
  readonly totalActivos = computed(() => this.usuarios().filter((u) => u.activo).length);
  readonly totalEstudiantes = computed(
    () => this.usuarios().filter((u) => u.roles.includes('ESTUDIANTE')).length,
  );
  readonly totalTutores = computed(
    () => this.usuarios().filter((u) => u.roles.includes('TUTOR')).length,
  );
  readonly totalAdministradores = computed(
    () => this.usuarios().filter((u) => u.roles.includes('ADMINISTRADOR')).length,
  );

  // Migración de usuario-form.html y perfil-usuario-form.html
  readonly usuarioEditando = signal<Usuario | null>(null);
  readonly usuarioAgregandoPerfil = signal<Usuario | null>(null);
  nuevoPerfilRol: 'ESTUDIANTE' | 'TUTOR' | 'ADMINISTRADOR' = 'ESTUDIANTE';
  nuevoPerfilCodigo = '';
  nuevoPerfilUniversidad = '';
  nuevoPerfilPrograma = '';
  nuevoPerfilSemestre = 1;
  nuevoPerfilBiografia = '';
  nuevoPerfilMaterias = '';
  nuevoPerfilTarifa = 1;

  get sesion() {
    return this.auth.sesion()?.rol === 'ADMINISTRADOR';
  }

  usuarios = signal<Usuario[]>([]);
  mensajeError = signal('');
  private readonly suscripciones = new Subscription();

  private readonly seleccionId$ = new Subject<number>();
  usuarioActual = signal<Usuario | null>(null);

  private readonly actualizar$ = new Subject<void>();
  listado$ = this.actualizar$.pipe(
    startWith(undefined),
    exhaustMap(() => this.consultarListado()),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private consultarListado() {
    this.cargando.set(true);
    return this.usuarioService.obtenerUsuarios().pipe(
      tap((lista) => {
        this.usuarios.set(lista);
        this.mensajeError.set('');
      }),
      catchError((error) => {
        console.error(error);
        this.mensajeError.set(mensajeHttp(error));
        return of(this.usuarios());
      }),
      finalize(() => this.cargando.set(false)),
    );
  }

  usuarioSeleccionado$ = this.usuarioService.usuarioSeleccionado$;

  filtro = new FormControl('', { nonNullable: true });

  usuariosFiltrados$ = combineLatest([
    merge(this.listado$, toObservable(this.usuarios)),
    this.filtro.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()),
  ]).pipe(
    map(([usuarios, texto]) => {
      const buscado = texto.toLowerCase().trim();
      return usuarios.filter((usuario) => usuario.nombre.toLowerCase().includes(buscado));
    }),
  );

  ngOnInit(): void {
    this.suscripciones.add(
      this.seleccionId$
        .pipe(
          switchMap((id) =>
            this.usuarioService.consultarPorId(id).pipe(
              catchError((error) => {
                console.error(error);
                return of(null);
              }),
            ),
          ),
        )
        .subscribe((usuario) => {
          this.usuarioActual.set(usuario);
          this.usuarioService.seleccionarUsuario(usuario);
        }),
    );
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
  }

  cargarUsuarios(): void {
    this.solicitarActualizacion();
  }

  solicitarActualizacion(): void {
    this.actualizar$.next();
  }

  seleccionarUsuario(id: number): void {
    this.usuarioActual.set(null);
    this.seleccionId$.next(id);
  }

  guardarUsuario(usuario: RegistroUsuario): void {
    if (!this.sesion || this.guardando()) return;
    this.guardando.set(true);
    this.guardado.set('');
    this.mensajeError.set('');
    this.suscripciones.add(
      this.usuarioService
        .guardar(usuario)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe({
          next: () => {
            this.guardado.set('Usuario registrado.');
            this.solicitarActualizacion();
          },
          error: (e) => this.mensajeError.set(mensajeHttp(e)),
        }),
    );
  }

  abrirEditarUsuario(usuario: Usuario): void {
    this.usuarioEditando.set({ ...usuario });
    this.usuarioAgregandoPerfil.set(null);
  }

  guardarEdicionLocal(): void {
    const editado = this.usuarioEditando();
    if (!editado) return;
    if (editado.telefono && !/^(\+57)?[0-9]{10}$/.test(editado.telefono)) {
      this.mensajeError.set('Teléfono inválido: usa 10 dígitos, opcionalmente precedidos por +57.');
      return;
    }
    this.usuarios.update((lista) => lista.map((u) => (u.id === editado.id ? { ...editado } : u)));
    this.guardado.set(`Datos de ${editado.nombre} actualizados.`);
    if (this.sesion) {
      this.usuarioService
        .actualizar(editado.id, {
          nombre: editado.nombre,
          apellido: editado.apellido,
          correo: editado.correo,
          telefono: editado.telefono,
        })
        .subscribe({
          next: () => this.solicitarActualizacion(),
          error: (e) => {
            this.mensajeError.set(mensajeHttp(e));
            this.solicitarActualizacion();
          },
        });
    }
    this.usuarioEditando.set(null);
  }

  abrirAgregarPerfil(usuario: Usuario): void {
    this.usuarioAgregandoPerfil.set(usuario);
    this.usuarioEditando.set(null);
  }

  confirmarAgregarPerfil(): void {
    const objetivo = this.usuarioAgregandoPerfil();
    if (!objetivo) return;
    const rol = this.nuevoPerfilRol;
    this.usuarios.update((lista) =>
      lista.map((u) =>
        u.id === objetivo.id && !u.roles.includes(rol) ? { ...u, roles: [...u.roles, rol] } : u,
      ),
    );
    this.guardado.set(`Perfil ${rol} asociado a ${objetivo.nombre}.`);
    if (this.sesion) {
      this.usuarioService
        .agregarPerfil(objetivo.id, {
          rol,
          codigoEstudiantil: this.nuevoPerfilCodigo,
          universidad: this.nuevoPerfilUniversidad,
          programaAcademico: this.nuevoPerfilPrograma,
          semestre: this.nuevoPerfilSemestre,
          biografia: this.nuevoPerfilBiografia,
          materias: this.nuevoPerfilMaterias,
          tarifaPorHora: this.nuevoPerfilTarifa,
        })
        .subscribe({
          next: () => this.solicitarActualizacion(),
          error: (e) => {
            this.mensajeError.set(mensajeHttp(e));
            this.solicitarActualizacion();
          },
        });
    }
    this.usuarioAgregandoPerfil.set(null);
  }

  alternarEstadoUsuario(usuario: Usuario): void {
    const nuevoEstado = !usuario.activo;
    this.usuarios.update((lista) =>
      lista.map((u) => (u.id === usuario.id ? { ...u, activo: nuevoEstado } : u)),
    );
    this.guardado.set(
      `Estado de ${usuario.nombre} cambiado a ${nuevoEstado ? 'Activo' : 'Inactivo'}.`,
    );
    if (this.sesion) {
      this.usuarioService.alternarEstado(usuario.id, nuevoEstado).subscribe({
        next: () => this.solicitarActualizacion(),
        error: (e) => {
          this.mensajeError.set(mensajeHttp(e));
          this.solicitarActualizacion();
        },
      });
    }
  }

  eliminarUsuario(usuario: Usuario): void {
    if (
      !confirm(
        `¿Estás seguro de eliminar al usuario #${usuario.id} (${usuario.nombre} ${usuario.apellido})?`,
      )
    ) {
      return;
    }
    this.usuarios.update((lista) => lista.filter((u) => u.id !== usuario.id));
    this.guardado.set(`Usuario #${usuario.id} (${usuario.nombre}) eliminado.`);
    if (this.usuarioActual()?.id === usuario.id) {
      this.usuarioActual.set(null);
    }
    if (this.sesion) {
      this.usuarioService.eliminar(usuario.id).subscribe({
        error: (e) => this.mensajeError.set(mensajeHttp(e)),
      });
    }
  }
}
