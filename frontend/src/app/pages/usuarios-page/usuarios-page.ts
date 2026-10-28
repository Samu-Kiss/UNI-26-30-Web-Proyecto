import { AsyncPipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  catchError,
  finalize,
  combineLatest,
  concatMap,
  debounceTime,
  defer,
  distinctUntilChanged,
  exhaustMap,
  forkJoin,
  from,
  interval,
  map,
  mergeMap,
  Observable,
  of,
  range,
  shareReplay,
  startWith,
  Subject,
  Subscription,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { RegistroUsuario, Usuario } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { mensajeHttp } from '../../core/services/api.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { BrandMarkComponent } from '../../shared/components/atoms/brand-mark/brand-mark';
import { UsuarioFormComponent } from '../../shared/components/organisms/usuario-form/usuario-form';

@Component({
  selector: 'app-usuarios-page',
  imports: [AsyncPipe, ReactiveFormsModule, UsuarioFormComponent, BrandMarkComponent, RouterLink],
  templateUrl: './usuarios-page.html',
})
export class UsuariosPageComponent implements OnInit, OnDestroy {
  private readonly usuarioService = inject(UsuarioService);
  readonly auth = inject(AuthService);
  readonly guardando = signal(false);
  readonly cargando = signal(false);
  readonly guardado = signal('');
  get sesion() {
    return this.auth.sesion()?.rol === 'ADMINISTRADOR';
  }

  usuarios = signal<Usuario[]>([]);
  mensajeError = signal('');
  private readonly suscripciones = new Subscription();

  private readonly seleccionId$ = new Subject<number>();
  usuarioActual = signal<Usuario | null>(null);

  resultadosRevision = signal<Usuario[]>([]);
  private revisionActual?: Subscription;

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
    this.listado$,
    this.filtro.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()),
  ]).pipe(
    map(([usuarios, texto]) => {
      const buscado = texto.toLowerCase().trim();
      return usuarios.filter((usuario) => usuario.nombre.toLowerCase().includes(buscado));
    }),
  );

  comparacion = signal<{
    primero: Usuario | null;
    segundo: Usuario | null;
  } | null>(null);

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

    this.suscripciones.add(timer(5000).subscribe(() => this.solicitarActualizacion()));
    this.suscripciones.add(interval(15000).subscribe(() => this.solicitarActualizacion()));
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
    this.revisionActual?.unsubscribe();
  }

  cargarUsuarios(): void {
    this.solicitarActualizacion();
  }

  solicitarActualizacion(): void {
    this.actualizar$.next();
  }

  examinarUsuarios(): void {
    const datos = this.usuarios();
    of(datos).subscribe((lista) => console.log('OF: total', lista.length));
    from(datos).subscribe((usuario) => console.log('FROM:', usuario.id, usuario.nombre));
    range(0, Math.min(5, datos.length)).subscribe((indice) =>
      console.log('RANGE:', indice, datos[indice].nombre),
    );
    const aviso$ = new Observable<string>((observador) => {
      observador.next(`Se recibieron ${datos.length} usuarios`);
      observador.next('Exploración de usuarios finalizada');
      observador.complete();
    });
    aviso$.subscribe((mensaje) => console.log('MANUAL:', mensaje));
  }

  seleccionarUsuario(id: number): void {
    this.usuarioActual.set(null);
    this.seleccionId$.next(id);
  }

  private consultarConRegistro(id: number): Observable<Usuario | null> {
    return defer(() => {
      console.log('INICIA CONSULTA:', id);
      return this.usuarioService.consultarPorId(id).pipe(
        tap(() => console.log('TERMINA CONSULTA:', id)),
        catchError((error) => {
          console.error('ERROR:', id, error);
          return of(null);
        }),
      );
    });
  }

  revisarEnOrden(): void {
    const ids = this.usuarios()
      .slice(0, 3)
      .map((u) => u.id);
    this.revisionActual?.unsubscribe();
    this.resultadosRevision.set([]);
    this.revisionActual = from(ids)
      .pipe(concatMap((id) => this.consultarConRegistro(id)))
      .subscribe((usuario) => {
        if (usuario !== null) {
          this.resultadosRevision.update((actual) => [...actual, usuario]);
        }
      });
  }

  revisarSimultaneamente(): void {
    const ids = this.usuarios()
      .slice(0, 3)
      .map((u) => u.id);
    this.revisionActual?.unsubscribe();
    this.resultadosRevision.set([]);
    this.revisionActual = from(ids)
      .pipe(mergeMap((id) => this.consultarConRegistro(id), 2))
      .subscribe((usuario) => {
        if (usuario !== null) {
          this.resultadosRevision.update((actual) => [...actual, usuario]);
        }
      });
  }

  compararUsuarios(): void {
    const seleccionados = this.usuarios().slice(0, 2);
    if (seleccionados.length < 2) return;
    this.suscripciones.add(
      forkJoin({
        primero: this.usuarioService.consultarPorId(seleccionados[0].id),
        segundo: this.usuarioService.consultarPorId(seleccionados[1].id),
      })
        .pipe(
          catchError((error) => {
            console.error(error);
            return of(null);
          }),
        )
        .subscribe((resultado) => this.comparacion.set(resultado)),
    );
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
}
