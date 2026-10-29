import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService, TutorApi } from '../../core/services/api.service';
import { MytStateService } from '../../core/services/myt-state.service';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';

@Component({
  selector: 'app-tutor-perfil-page',
  imports: [RouterLink, AvatarComponent, LucideIconComponent],
  template: `
    <main class="myt-screen" data-node-id="1:1033">
      <a routerLink="/tutores" class="myt-back-link">
        <app-lucide-icon name="arrow-left" [size]="16" />
        <span>Volver a resultados</span>
      </a>

      @if (cargando()) {
        <output class="myt-status-output">Cargando perfil del tutor…</output>
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
              ★ {{ perfilVista().calificacionTexto }} · {{ resenasTutor().length }} reseñas verificadas
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
                <app-lucide-icon name="plus" [size]="15" />
                <span>Dejar reseña</span>
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
  styles: [
    `
      .myt-screen {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        max-width: 1120px;
        margin: 0 auto;
      }
      .myt-back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.85rem;
        font-weight: 700;
        color: #1985a1;
        text-decoration: none;
        align-self: flex-start;
      }
      .myt-profile-hero {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 20px;
        padding: 1.75rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
        flex-wrap: wrap;
      }
      .myt-profile-hero__identity {
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }
      .myt-profile-hero__info h1 {
        font-size: 1.75rem;
        color: #46494c;
        margin: 0;
      }
      .myt-profile-hero__role {
        margin: 0.2rem 0 0;
        font-size: 0.95rem;
        font-weight: 600;
        color: #4c5c68;
      }
      .myt-profile-hero__stats {
        margin: 0.35rem 0 0;
        font-size: 0.85rem;
        font-weight: 600;
        color: #46494c;
      }
      .myt-profile-hero__meta {
        margin: 0.2rem 0 0;
        font-size: 0.8rem;
        color: #6f7479;
      }
      .myt-profile-hero__pricing {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
      }
      .myt-profile-hero__price {
        font-size: 1.35rem;
        color: #46494c;
      }
      .myt-profile-hero__unit {
        font-size: 0.78rem;
        color: #6f7479;
        margin-bottom: 0.45rem;
      }
      .myt-profile-grid {
        display: grid;
        grid-template-columns: 1.6fr 1fr;
        gap: 1.5rem;
        align-items: start;
      }
      @media (max-width: 920px) {
        .myt-profile-grid {
          grid-template-columns: 1fr;
        }
      }
      .myt-profile-main {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .myt-paper-card {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 18px;
        padding: 1.5rem 1.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }
      .myt-paper-card h2 {
        font-size: 1.2rem;
        color: #46494c;
        margin: 0;
      }
      .myt-profile-bio {
        font-size: 0.92rem;
        line-height: 1.55;
        color: #4c5c68;
      }
      .myt-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .myt-card-head-inline {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      .myt-link-action {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.85rem;
        font-weight: 700;
        color: #1985a1;
        text-decoration: none;
      }
      .myt-reviews-stack {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .myt-review-item {
        padding: 0.85rem 0;
        border-bottom: 1px solid #e4e4e5;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .myt-review-item:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }
      .myt-review-item strong {
        font-size: 0.88rem;
        color: #46494c;
      }
      .myt-review-item p {
        font-size: 0.85rem;
        color: #4c5c68;
      }
      .myt-availability-month {
        font-size: 0.85rem;
        color: #6f7479;
      }
      .myt-days-strip {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.55rem;
      }
      .myt-day-pill {
        background: #ffffff;
        border: 1px solid #c5c3c6;
        border-radius: 12px;
        padding: 0.65rem 0.4rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.2rem;
        cursor: pointer;
        color: #46494c;
      }
      .myt-day-pill--active {
        background: #1985a1;
        border-color: #1985a1;
        color: #f5f5f3;
      }
      .myt-day-pill__dow {
        font-size: 0.68rem;
        font-weight: 700;
      }
      .myt-day-pill__num {
        font-size: 1rem;
      }
      .myt-availability-subtitle {
        font-size: 0.9rem;
        color: #46494c;
        margin: 0.35rem 0 0;
      }
      .myt-hours-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.55rem;
      }
      .myt-hour-chip {
        background: #ffffff;
        border: 1px solid #c5c3c6;
        border-radius: 10px;
        padding: 0.55rem;
        font-size: 0.82rem;
        font-weight: 600;
        color: #46494c;
        cursor: pointer;
      }
      .myt-hour-chip--active {
        background: #ddecef;
        border-color: #1985a1;
        color: #1985a1;
        font-weight: 700;
      }
      .myt-availability-note {
        font-size: 0.78rem;
        color: #6f7479;
      }
    `,
  ],
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
    () =>
      this.state.disponibilidadPorDefecto[this.indiceDia()] ??
      this.state.disponibilidadPorDefecto[0],
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
        calificacionTexto: t.calificacion ? t.calificacion.toFixed(1).replace('.', ',') : 'Sin calificaciones',
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
      calificacionTexto: 'Sin calificaciones',
      tarifaTexto: '$45.000 COP',
      biografia:
        'Acompaño a estudiantes universitarios a comprender cálculo diferencial, integral y física mecánica mediante ejemplos claros y ejercicios guiados. Mi enfoque se adapta al ritmo y objetivos de cada estudiante.',
      etiquetasMaterias: ['Cálculo diferencial', 'Cálculo integral', 'Física mecánica'],
    };
  });

  readonly primerNombre = computed(() => this.perfilVista().nombre.split(' ')[0] || 'Laura');

  readonly resenasTutor = computed(() => {
    return this.state
      .resenas()
      .filter((r) => r.publica && r.tutorNombre.toLowerCase().includes(this.primerNombre().toLowerCase()));
  });

  ngOnInit(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('id'));
    if (idParam > 0) {
      const enCache = this.api.tutorEnCache(idParam);
      if (enCache) {
        this.tutorApi.set(enCache);
      } else {
        this.cargando.set(true);
      }
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
