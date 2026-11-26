import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ApiService, Materia, TutorApi, TutorEdicion, mensajeHttp } from '../../core/services/api.service';
import { Usuario } from '../../core/models/usuario.model';
import { AgendaEditorComponent } from '../../shared/components/organisms/agenda-editor/agenda-editor';
import { TutorEditorComponent } from '../../shared/components/organisms/tutor-editor/tutor-editor';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';

@Component({
  selector: 'app-perfil-page',
  imports: [
    FormsModule,
    AgendaEditorComponent,
    TutorEditorComponent,
    LucideIconComponent,
    AvatarComponent,
  ],
  templateUrl: './perfil-page.html',
  styleUrl: './perfil-page.css',
})
export class PerfilPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  readonly route = inject(ActivatedRoute);
  readonly destroyRef = inject(DestroyRef);
  readonly esSetup = computed(() => this.route.snapshot.queryParamMap.get('setup') === '1');
  readonly usuario = signal<Usuario | null>(null);
  readonly tutor = signal<TutorApi | null>(null);
  readonly materiasDisponibles = signal<Materia[]>([]);
  readonly guardandoTutor = signal(false);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  private ultimoTutorCargadoId: number | null = null;

  constructor() {
    effect(() => {
      const sesion = this.auth.sesion();
      if (sesion?.rol === 'TUTOR' && sesion.perfilId && sesion.perfilId !== this.ultimoTutorCargadoId) {
        this.ultimoTutorCargadoId = sesion.perfilId;
        this.cargarDatosTutor(sesion.perfilId);
      }
    });
  }

  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.http
      .get<Usuario>('/api/perfil')
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (u) => this.usuario.set(u),
        error: (e) => this.error.set(mensajeHttp(e)),
      });
    const sesion = this.auth.sesion();
    if (sesion?.rol === 'TUTOR' && sesion.perfilId) {
      this.ultimoTutorCargadoId = sesion.perfilId;
      this.cargarDatosTutor(sesion.perfilId);
    }
  }
  cargarDatosTutor(tutorId: number) {
    if (typeof this.api.tutor === 'function') {
      this.api
        .tutor(tutorId)
        .pipe(
          catchError(() => of(null)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((t) => {
          if (t) this.tutor.set(t);
        });
    }
    if (typeof this.api.materias === 'function') {
      this.api
        .materias()
        .pipe(
          catchError(() => of([])),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((m) => this.materiasDisponibles.set(m));
    }
  }
  guardarTutor(datos: TutorEdicion) {
    const actual = this.tutor();
    if (!actual || this.guardandoTutor() || typeof this.api.editarTutor !== 'function') return;
    this.guardandoTutor.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.api
      .editarTutor(actual.id, datos)
      .pipe(
        finalize(() => this.guardandoTutor.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (actualizado) => {
          this.tutor.set(actualizado);
          if (actualizado?.materias?.length) {
            this.materiasDisponibles.update((actuales) => {
              const mapa = new Map(actuales.map((m) => [m.id, m]));
              for (const m of actualizado.materias) {
                mapa.set(m.id, m);
              }
              return Array.from(mapa.values());
            });
          }
          this.mensaje.set('Perfil de tutor y materias actualizados.');
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
  guardar() {
    const u = this.usuario();
    if (!u || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.http
      .put<Usuario>('/api/perfil', u)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => {
          this.usuario.set(r);
          this.mensaje.set('Perfil actualizado.');
          this.auth.sesion.update((s) =>
            s ? { ...s, nombreUsuario: r.nombre + ' ' + r.apellido } : s,
          );
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
}
