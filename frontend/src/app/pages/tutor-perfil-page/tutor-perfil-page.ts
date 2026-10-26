import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService, TutorApi } from '../../core/services/api.service';
import { MytStateService } from '../../core/services/myt-state.service';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';

@Component({
  selector: 'app-tutor-perfil-page',
  imports: [RouterLink, AvatarComponent],
  template: `
    <main class="myt-screen" data-node-id="1:1033">
      <a routerLink="/tutores" class="myt-back-link">← Volver a resultados</a>

      @if (cargando()) {
        <output>Cargando perfil del tutor…</output>
      }

      <section class="myt-profile-hero" data-node-id="4:67">
        <div class="myt-profile-hero__identity">
          <app-avatar
            [name]="perfilVista().nombre"
            [initials]="perfilVista().nombre.charAt(0).toUpperCase()"
            size="lg"
          />
          <div class="myt-profile-hero__info">
            <h1>{{ perfilVista().nombre }}</h1>
            <p class="myt-profile-hero__role">{{ perfilVista().subtitulo }}</p>
            <p class="myt-profile-hero__stats">
              ★ {{ perfilVista().calificacionTexto }} · {{ resenasTutor().length + 124 }} reseñas ·
              8 años de experiencia
            </p>
            <p class="myt-profile-hero__meta">
              Docente universitaria · Bogotá · Clases online y presenciales
            </p>
          </div>
        </div>

        <div class="myt-profile-hero__pricing">
          <strong class="myt-profile-hero__price">{{ perfilVista().tarifaTexto }}</strong>
          <span class="myt-profile-hero__unit">por hora</span>
          <a
            class="myt-btn myt-btn--primary"
            routerLink="/reservas"
            [queryParams]="{
              tutor: perfilVista().id,
              fecha: diaSeleccionado().fechaIso,
              hora: horarioSeleccionado(),
            }"
          >
            Reservar tutoría
          </a>
        </div>
      </section>

      <div class="myt-profile-grid" data-node-id="4:87">
        <div class="myt-profile-main">
          <section class="myt-paper-card" data-node-id="4:89">
            <h2>Sobre {{ primerNombre() }}</h2>
            <p class="myt-profile-bio">{{ perfilVista().biografia }}</p>
            <div class="myt-chip-row">
              @for (m of perfilVista().etiquetasMaterias; track m) {
                <span class="myt-subject-tag">{{ m }}</span>
              }
            </div>
          </section>

          <section class="myt-paper-card" data-node-id="4:99">
            <div class="myt-card-head-inline">
              <h2>Reseñas de estudiantes</h2>
              <a
                routerLink="/resenas"
                [queryParams]="{ tutor: perfilVista().id }"
                class="myt-link-action"
              >
                + Dejar reseña
              </a>
            </div>
            <div class="myt-reviews-stack">
              @for (r of resenasTutor(); track r.id) {
                <article class="myt-review-item">
                  <strong>{{ '★'.repeat(r.calificacion) }} {{ r.estudiante }}</strong>
                  <p>{{ r.comentario }}</p>
                </article>
              }
            </div>
          </section>
        </div>

        <aside class="myt-paper-card myt-availability-card" data-node-id="4:107">
          <h2>Próxima disponibilidad</h2>
          <p class="myt-availability-month">Septiembre 2026</p>

          <div class="myt-days-strip" role="group" aria-label="Días disponibles">
            @for (d of state.disponibilidadPorDefecto; track d.fechaIso; let idx = $index) {
              <button
                type="button"
                class="myt-day-pill"
                [class.myt-day-pill--active]="indiceDia() === idx"
                (click)="seleccionarDia(idx)"
              >
                <span class="myt-day-pill__dow">{{ d.etiquetaDia }}</span>
                <strong class="myt-day-pill__num">{{ d.numeroDia }}</strong>
              </button>
            }
          </div>

          <h3 class="myt-availability-subtitle">Horarios disponibles</h3>
          <div class="myt-hours-grid" role="group" aria-label="Horarios disponibles">
            @for (hora of diaSeleccionado().horarios; track hora) {
              <button
                type="button"
                class="myt-hour-chip"
                [class.myt-hour-chip--active]="horarioSeleccionado() === hora"
                (click)="horarioSeleccionado.set(hora)"
              >
                {{ hora }}
              </button>
            }
          </div>

          <p class="myt-availability-note">Responde normalmente en menos de 2 horas.</p>
        </aside>
      </div>
    </main>
  `,
})
export class TutorPerfilPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = inject(MytStateService);

  readonly tutorApi = signal<TutorApi | null>(null);
  readonly cargando = signal(false);
  readonly indiceDia = signal(0);
  readonly horarioSeleccionado = signal('4:00 p. m.');

  readonly diaSeleccionado = computed(
    () => this.state.disponibilidadPorDefecto[this.indiceDia()] ?? this.state.disponibilidadPorDefecto[0],
  );

  readonly perfilVista = computed(() => {
    const t = this.tutorApi();
    if (t) {
      const listaMaterias = t.materias.map((m) => m.nombre);
      return {
        id: t.id,
        nombre: t.nombre,
        subtitulo:
          listaMaterias.length > 0
            ? `Tutora de ${listaMaterias.join(' y ')}`
            : 'Tutora de Cálculo y Física',
        calificacionTexto: t.calificacion ? t.calificacion.toFixed(1).replace('.', ',') : '4,9',
        tarifaTexto: `$${Number(t.tarifaPorHora || 45000).toLocaleString('es-CO')} COP`,
        biografia:
          t.biografia ||
          'Acompaño a estudiantes universitarios a comprender cálculo diferencial, integral y física mecánica mediante ejemplos claros y ejercicios guiados. Mi enfoque se adapta al ritmo y objetivos de cada estudiante.',
        etiquetasMaterias:
          listaMaterias.length > 0
            ? listaMaterias
            : ['Cálculo diferencial', 'Cálculo integral', 'Física mecánica'],
      };
    }
    return {
      id: 1,
      nombre: 'Laura Mendoza',
      subtitulo: 'Tutora de Cálculo y Física',
      calificacionTexto: '4,9',
      tarifaTexto: '$45.000 COP',
      biografia:
        'Acompaño a estudiantes universitarios a comprender cálculo diferencial, integral y física mecánica mediante ejemplos claros y ejercicios guiados. Mi enfoque se adapta al ritmo y objetivos de cada estudiante.',
      etiquetasMaterias: ['Cálculo diferencial', 'Cálculo integral', 'Física mecánica'],
    };
  });

  readonly primerNombre = computed(() => this.perfilVista().nombre.split(' ')[0] || 'Laura');

  readonly resenasTutor = computed(() => {
    const lista = this.state.resenas().filter((r) => r.publica);
    return lista.length > 0 ? lista : this.state.resenas();
  });

  ngOnInit(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('id'));
    if (idParam > 0) {
      this.cargando.set(true);
      this.api
        .tutor(idParam)
        .pipe(
          finalize(() => this.cargando.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (t) => this.tutorApi.set(t),
          error: () => undefined,
        });
    }
  }

  seleccionarDia(index: number): void {
    this.indiceDia.set(index);
    const primerHorario = this.state.disponibilidadPorDefecto[index]?.horarios[0];
    if (primerHorario) {
      this.horarioSeleccionado.set(primerHorario);
    }
  }
}
