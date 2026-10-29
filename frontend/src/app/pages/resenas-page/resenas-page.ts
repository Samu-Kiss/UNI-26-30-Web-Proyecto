import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { MytStateService } from '../../core/services/myt-state.service';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';

@Component({
  selector: 'app-resenas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AvatarComponent, LucideIconComponent],
  template: `
    <main class="myt-review-wrapper" aria-label="Dejar reseña">
      <section class="myt-review-card">
        <header class="myt-review-header">
          <h1>Cuéntanos cómo te fue</h1>
          <p>Tu reseña ayudará a otros estudiantes a elegir mejor.</p>
        </header>

        <!-- Session Banner -->
        <div class="myt-review-session">
          <div class="myt-review-session__left">
            <app-avatar name="Laura Mendoza" initials="L" size="lg" />
            <div>
              <h2>{{ tutorSeleccionado() }}</h2>
              <p>{{ sesionDetalle() }}</p>
            </div>
          </div>
          <span class="myt-badge-finished">Finalizada</span>
        </div>

        @if (enviada()) {
          <div class="myt-alert myt-alert--success" role="status">
            <strong>¡Gracias por tu reseña!</strong> Se ha publicado en el perfil de
            {{ tutorSeleccionado() }}.
          </div>
        }

        <form class="myt-review-form" (ngSubmit)="publicarResena()">
          <!-- Rating -->
          <div class="myt-review-section">
            <span class="myt-review-label">Calificación general</span>
            <div class="myt-stars-row" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
              @for (star of estrellas; track star) {
                <button
                  type="button"
                  class="myt-star-btn"
                  [class.myt-star-btn--active]="star <= calificacion()"
                  (click)="calificacion.set(star)"
                  [attr.aria-label]="star + ' estrellas'"
                >
                  <app-lucide-icon name="star" [size]="20" [filled]="star <= calificacion()" />
                </button>
              }
              <span class="myt-stars-caption">{{ etiquetaCalificacion() }}</span>
            </div>
          </div>

          <!-- Highlights -->
          <div class="myt-review-section">
            <span class="myt-review-label">¿Qué destacarías?</span>
            <div class="myt-chips-row">
              @for (item of opcionesDestacables; track item) {
                <button
                  type="button"
                  class="myt-chip-toggle"
                  [class.myt-chip-toggle--selected]="esDestacado(item)"
                  (click)="alternarDestacado(item)"
                >
                  @if (esDestacado(item)) {
                    <app-lucide-icon name="check" [size]="14" />
                  }
                  <span>{{ item }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Comment -->
          <div class="myt-review-section">
            <label class="myt-review-label" for="comentario-resena">Comentario (opcional)</label>
            <textarea
              id="comentario-resena"
              name="comentario"
              rows="4"
              [(ngModel)]="comentario"
              placeholder="Escribe cómo fue tu experiencia..."
            ></textarea>
          </div>

          <!-- Checkbox -->
          <label class="myt-checkbox-row">
            <input type="checkbox" name="publicar" [(ngModel)]="publicarEnPerfil" />
            <span>Publicar esta reseña en el perfil de la tutora</span>
          </label>

          <!-- Actions -->
          <div class="myt-review-actions">
            <a [routerLink]="['/tutores', tutorId()]" class="myt-btn myt-btn--secondary">Ahora no</a>
            <button type="submit" class="myt-btn myt-btn--primary">Publicar reseña</button>
          </div>
        </form>
      </section>

      <!-- Recent Reviews List -->
      <section class="myt-review-card myt-review-history" aria-label="Reseñas recientes">
        <h2>Reseñas publicadas recientemente</h2>
        <div class="myt-reviews-stack">
          @for (resena of state.resenas(); track resena.id) {
            <article class="myt-review-item">
              <div class="myt-review-item__top">
                <strong>{{ resena.estudiante }} · {{ resena.fecha }}</strong>
                <span class="myt-review-item__stars">{{ '★'.repeat(resena.calificacion) }}</span>
              </div>
              <p>{{ resena.comentario }}</p>
              <div class="myt-chips-row">
                @for (tag of resena.etiquetas; track tag) {
                  <span class="myt-tag-mini">✓ {{ tag }}</span>
                }
              </div>
            </article>
          }
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .myt-review-wrapper {
        max-width: 720px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .myt-review-card {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 22px;
        padding: 2.25rem;
      }
      .myt-review-header h1 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 700;
        color: #46494c;
      }
      .myt-review-header p {
        margin: 0.35rem 0 0;
        color: #4c5c68;
        font-size: 0.95rem;
      }
      .myt-review-session {
        margin-top: 1.5rem;
        padding: 1.1rem 1.25rem;
        border-radius: 16px;
        background: #e9e9ea;
        border: 1px solid #c5c3c6;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .myt-review-session__left {
        display: flex;
        align-items: center;
        gap: 0.95rem;
      }
      .myt-review-session__left h2 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #46494c;
      }
      .myt-review-session__left p {
        margin: 0.2rem 0 0;
        font-size: 0.85rem;
        color: #4c5c68;
      }
      .myt-badge-finished {
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 700;
        color: #11816f;
        background: rgba(17, 129, 111, 0.12);
      }
      .myt-review-form {
        margin-top: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.4rem;
      }
      .myt-review-section {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .myt-review-label {
        font-size: 0.9rem;
        font-weight: 700;
        color: #46494c;
      }
      .myt-stars-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .myt-star-btn {
        width: 48px;
        height: 44px;
        border-radius: 12px;
        border: 1px solid #c5c3c6;
        background: #ffffff;
        font-size: 1.35rem;
        color: #c5c3c6;
        cursor: pointer;
        transition: transform 120ms ease, border-color 120ms ease;
      }
      .myt-star-btn--active {
        color: #f4b740;
        border-color: #f4b740;
        background: #fffdf7;
      }
      .myt-stars-caption {
        margin-left: 0.5rem;
        font-size: 0.9rem;
        font-weight: 700;
        color: #4c5c68;
      }
      .myt-chips-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
      }
      .myt-chip-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.45rem 0.9rem;
        border-radius: 999px;
        border: 1px solid #c5c3c6;
        background: #ffffff;
        color: #46494c;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
      }
      .myt-chip-toggle--selected {
        background: #1985a1;
        border-color: #1985a1;
        color: #f5f5f3;
      }
      .myt-review-section textarea {
        background: #ffffff;
        border: 1px solid #c5c3c6;
        border-radius: 14px;
        padding: 0.9rem 1rem;
        font-size: 0.9rem;
        color: #46494c;
        resize: vertical;
      }
      .myt-checkbox-row {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        font-size: 0.85rem;
        color: #46494c;
        cursor: pointer;
      }
      .myt-checkbox-row input {
        width: 18px;
        height: 18px;
        accent-color: #1985a1;
      }
      .myt-review-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.85rem;
        margin-top: 0.5rem;
      }
      .myt-review-history h2 {
        margin: 0 0 1rem;
        font-size: 1.15rem;
        color: #46494c;
      }
      .myt-reviews-stack {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }
      .myt-review-item {
        padding: 1rem 1.15rem;
        border-radius: 14px;
        background: #ffffff;
        border: 1px solid #dcdcdd;
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
      }
      .myt-review-item__top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .myt-review-item__stars {
        color: #f4b740;
        font-weight: 700;
      }
      .myt-review-item p {
        margin: 0;
        font-size: 0.88rem;
        color: #4c5c68;
      }
      .myt-tag-mini {
        font-size: 0.74rem;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        background: #ddecef;
        color: #1985a1;
        font-weight: 600;
      }
    `,
  ],
})
export class ResenasPageComponent implements OnInit {
  readonly state = inject(MytStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly estrellas = [1, 2, 3, 4, 5];
  readonly calificacion = signal(5);
  readonly tutorId = signal(1);
  readonly tutorSeleccionado = signal('Laura Mendoza');
  readonly temaActual = signal('Derivadas e integrales');
  readonly sesionDetalle = signal('Derivadas e integrales · Sesión reciente');
  readonly enviada = signal(false);

  readonly opcionesDestacables = [
    'Explica con claridad',
    'Es puntual',
    'Material útil',
    'Buena comunicación',
    'Domina el tema',
  ];

  readonly destacadosSeleccionados = signal<string[]>([
    'Explica con claridad',
    'Es puntual',
    'Buena comunicación',
  ]);

  comentario =
    'Excelente sesión. Me ayudó a entender cómo plantear los ejercicios antes de resolverlos y me compartió apuntes muy claros.';
  publicarEnPerfil = true;

  ngOnInit(): void {
    const rawId =
      this.route.snapshot.queryParamMap.get('tutor') ||
      this.route.snapshot.queryParamMap.get('tutorId');
    const idParam = rawId ? Number(rawId) : 0;
    const nombreParam = this.route.snapshot.queryParamMap.get('tutorNombre');
    const temaParam = this.route.snapshot.queryParamMap.get('tema');

    if (idParam > 0) {
      this.tutorId.set(idParam);
      if (nombreParam) {
        this.tutorSeleccionado.set(nombreParam);
      } else {
        const enCache = this.api.tutorEnCache(idParam);
        if (enCache) {
          this.tutorSeleccionado.set(enCache.nombre);
        } else {
          this.api.tutor(idParam).subscribe({
            next: (t) => this.tutorSeleccionado.set(t.nombre),
            error: () => undefined,
          });
        }
      }
    }
    if (temaParam) {
      this.temaActual.set(temaParam);
      this.sesionDetalle.set(`${temaParam} · Tutoría`);
    }
  }

  readonly etiquetaCalificacion = computed(() => {
    const val = this.calificacion();
    if (val === 5) return 'Excelente';
    if (val === 4) return 'Muy buena';
    if (val === 3) return 'Buena';
    if (val === 2) return 'Regular';
    return 'Por mejorar';
  });

  esDestacado(item: string): boolean {
    return this.destacadosSeleccionados().includes(item);
  }

  alternarDestacado(item: string): void {
    const actual = this.destacadosSeleccionados();
    if (actual.includes(item)) {
      this.destacadosSeleccionados.set(actual.filter((x) => x !== item));
    } else {
      this.destacadosSeleccionados.set([...actual, item]);
    }
  }

  publicarResena(): void {
    const tid = this.tutorId();
    const estudianteNombre = this.auth.sesion()?.nombreUsuario || 'Estudiante MyT';
    this.state.agregarResena({
      tutorId: tid,
      tutorNombre: this.tutorSeleccionado(),
      estudiante: estudianteNombre,
      calificacion: this.calificacion(),
      comentario: this.comentario.trim() || 'Sesión muy clara y bien estructurada.',
      etiquetas: this.destacadosSeleccionados(),
      tema: this.temaActual(),
      publica: this.publicarEnPerfil,
    });
    this.enviada.set(true);
    setTimeout(() => {
      void this.router.navigate(['/tutores', tid]);
    }, 900);
  }
}
