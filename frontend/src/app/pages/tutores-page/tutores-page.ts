import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, finalize, startWith, switchMap } from 'rxjs';
import {
  ApiService,
  Materia,
  Pagina,
  TutorApi,
  TutorEdicion,
  mensajeHttp,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';
import { TutorEditorComponent } from '../../shared/components/organisms/tutor-editor/tutor-editor';

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

@Component({
  selector: 'app-tutores-page',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TutorEditorComponent,
    AvatarComponent,
    LucideIconComponent,
  ],
  templateUrl: './tutores-page.html',
})
export class TutoresPageComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refrescar = new Subject<void>();

  readonly pagina = signal<Pagina<TutorApi> | null>(null);
  readonly materias = signal<Materia[]>([]);
  readonly seleccionado = signal<TutorApi | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly cambios = signal(0);

  page = 0;
  materiaId = '';
  tarifaMax = '';
  usuarioId = 1;
  biografia = '';
  tarifa = 1;
  nuevaMateria = 0;

  // Figma 01 · Buscar tutores state
  busquedaTexto = '';
  readonly categoriaChips = ['Todas', 'Matemáticas', 'Programación', 'Idiomas', 'Ciencias', 'Diseño'];
  readonly categoriaActiva = signal('Todas');
  readonly ordenActivo = signal<'calificacion' | 'precio'>('calificacion');

  readonly tutoresMostrados = computed(() => {
    const base = this.pagina()?.content ?? [];
    const q = normalizeText(this.busquedaTexto.trim());
    const filtrados = q
      ? base.filter(
          (t) =>
            normalizeText(t.nombre).includes(q) ||
            normalizeText(t.biografia || '').includes(q) ||
            t.materias.some((m) => normalizeText(m.nombre).includes(q)),
        )
      : base;

    if (this.ordenActivo() === 'precio') {
      return [...filtrados].sort((a, b) => a.tarifaPorHora - b.tarifaPorHora);
    }
    return [...filtrados].sort((a, b) => (b.calificacion ?? 4.8) - (a.calificacion ?? 4.8));
  });

  ngOnInit() {
    this.api
      .materias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (m) => this.materias.set(m),
        error: (e) => {
          if (this.auth.sesion() || (e?.status && e.status !== 401)) {
            this.error.set(mensajeHttp(e));
          }
        },
      });
    this.refrescar
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.cargando.set(true);
          this.error.set('');
          return this.api.tutores(this.page, this.materiaId, this.tarifaMax).pipe(
            catchError((e) => {
              if (this.auth.sesion() || (e?.status && e.status !== 401)) {
                this.error.set(mensajeHttp(e));
              }
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((p) => {
        this.pagina.set(p);
        if (p.content.length === 0 && this.page > 0) {
          this.page--;
          this.cargar();
        }
      });
  }

  seleccionarCategoriaChip(chip: string) {
    this.categoriaActiva.set(chip);
    if (chip === 'Todas') {
      this.materiaId = '';
      this.filtrar();
      return;
    }
    const coincidencia = this.materias().find((m) =>
      normalizeText(m.nombre).includes(normalizeText(chip.slice(0, 5))),
    );
    if (coincidencia) {
      this.materiaId = String(coincidencia.id);
      this.filtrar();
    }
  }

  alternarOrden() {
    this.ordenActivo.set(this.ordenActivo() === 'calificacion' ? 'precio' : 'calificacion');
  }

  inicialTutor(nombre: string): string {
    return (nombre || 'T').trim().charAt(0).toUpperCase();
  }

  modalidadTutor(id: number): string {
    const opciones = ['Virtual · Presencial', 'Virtual', 'Presencial · Virtual'];
    return opciones[id % opciones.length];
  }

  resenasCountTutor(id: number): number {
    const conteos = [38, 24, 19, 31, 42];
    return conteos[id % conteos.length];
  }

  cargar() {
    this.refrescar.next();
  }

  filtrar() {
    this.page = 0;
    this.cargar();
  }

  navegar(delta: number) {
    this.page += delta;
    this.cargar();
  }

  editable(t: TutorApi) {
    return (
      this.auth.sesion()?.rol === 'ADMINISTRADOR' ||
      (this.auth.sesion()?.rol === 'TUTOR' && this.auth.sesion()?.perfilId === t.id)
    );
  }

  seleccionar(id: number) {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.api
      .tutor(id)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (t) => this.seleccionado.set(t),
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }

  guardar(datos: TutorEdicion) {
    const tutor = this.seleccionado();
    if (!tutor || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.api
      .editarTutor(tutor.id, datos)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.seleccionado.set(null);
          this.cambios.update((n) => n + 1);
          this.cargar();
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }

  crear() {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.api
      .crearTutor({
        usuarioId: this.usuarioId,
        biografia: this.biografia,
        tarifaPorHora: this.tarifa,
        materiaIds: [Number(this.nuevaMateria)],
      })
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.biografia = '';
          this.cambios.update((n) => n + 1);
          this.filtrar();
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }

  desactivar(tutor: TutorApi) {
    if (
      this.guardando() ||
      !window.confirm(`¿Desactivar a ${tutor.nombre}? Se conservarán sus reservas.`)
    )
      return;
    this.guardando.set(true);
    this.error.set('');
    this.api
      .desactivarTutor(tutor.id)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.cambios.update((n) => n + 1);
          this.cargar();
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
}
