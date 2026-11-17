import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, TutorApi, mensajeHttp } from '../../core/services/api.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  LucideIconComponent,
  LucideIconName,
} from '../../shared/components/atoms/lucide-icon/lucide-icon';

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, RouterLink, FormsModule, LucideIconComponent],
  template: `
    <div class="myt-landing" data-node-id="23:137">
      <!-- 1. Top Navigation (27:137) -->
      <header class="myt-landing__nav" data-node-id="27:137">
        <div class="myt-landing__nav-inner">
          <a routerLink="/" class="myt-landing__brand">MyT</a>

          <nav class="myt-landing__links" aria-label="Navegación de inicio">
            <a href="#como-funciona">Cómo funciona</a>
            <a routerLink="/tutores">Encuentra tutores</a>
            <a href="#para-tutores">Para tutores</a>
          </nav>

          <div class="myt-landing__actions">
            @if (auth.sesion(); as s) {
              <a
                [routerLink]="
                  s.rol === 'ADMINISTRADOR'
                    ? '/usuarios'
                    : s.rol === 'TUTOR'
                      ? '/reservas'
                      : '/tutores'
                "
                class="myt-landing__btn myt-landing__btn--outline"
              >
                Ir al panel ({{ s.nombreUsuario || s.rol }})
              </a>
            } @else {
              <a routerLink="/login" class="myt-landing__btn myt-landing__btn--outline">
                Iniciar sesión
              </a>
              <a routerLink="/registro" class="myt-landing__btn myt-landing__btn--primary">
                Crear cuenta
              </a>
            }
          </div>
        </div>
      </header>

      <!-- 2. Hero Section (27:151) -->
      <section class="myt-landing__hero" data-node-id="27:151">
        <div class="myt-landing__hero-inner">
          <div class="myt-landing__hero-copy">
            <h1>Tu próxima tutoría empieza con la persona correcta.</h1>
            <p>
              Encuentra tutores verificados, compara horarios y agenda clases según tus objetivos,
              sin conversaciones interminables ni gestión manual.
            </p>
            <div class="myt-landing__hero-cta">
              <a
                routerLink="/tutores"
                class="myt-landing__btn myt-landing__btn--primary myt-landing__btn--lg"
              >
                Encontrar un tutor
              </a>
              <a
                routerLink="/registro"
                [queryParams]="{ rol: 'TUTOR' }"
                class="myt-landing__btn myt-landing__btn--outline myt-landing__btn--lg"
              >
                Quiero enseñar
              </a>
            </div>
            <span class="myt-landing__hero-note">
              Sin costo para explorar · Reserva en pocos minutos
            </span>
          </div>

          <!-- Hero Right Preview Card with rotated shadow -->
          <div class="myt-landing__preview-stage">
            <div class="myt-landing__preview-shadow" aria-hidden="true"></div>
            <div class="myt-landing__preview-card" data-node-id="27:164">
              <form class="myt-landing__preview-search" (ngSubmit)="buscarRapido()">
                <app-lucide-icon name="search" [size]="16" class="myt-landing__search-icon" />
                <input
                  type="search"
                  name="busqueda"
                  [(ngModel)]="busquedaHero"
                  placeholder="¿Qué quieres aprender?"
                  aria-label="¿Qué quieres aprender?"
                />
                <button type="submit" class="myt-landing__search-submit">Buscar</button>
              </form>

              <h2>Áreas de conocimiento</h2>
              <div class="myt-landing__preview-list">
                @for (area of areasConocimiento; track area.nombre) {
                  <a
                    routerLink="/tutores"
                    [queryParams]="{ q: area.nombre }"
                    class="myt-landing__tutor-mini"
                  >
                    <span class="myt-landing__mini-avatar" aria-hidden="true">
                      <app-lucide-icon [name]="area.icono" [size]="18" />
                    </span>
                    <div class="myt-landing__mini-info">
                      <strong>{{ area.nombre }}</strong>
                      <small>{{ area.descripcion }}</small>
                    </div>
                    <app-lucide-icon name="chevron-right" [size]="16" />
                  </a>
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="myt-landing__trust" aria-label="Ventajas de MyT">
        <div class="myt-landing__trust-inner">
          <div class="myt-landing__metric">
            <strong>Horarios reales</strong><span>Disponibilidad según la agenda del tutor</span>
          </div>
          <div class="myt-landing__metric">
            <strong>Reseñas verificadas</strong><span>Solo después de completar una tutoría</span>
          </div>
          <div class="myt-landing__metric">
            <strong>Agenda centralizada</strong
            ><span>Tus reservas y conversaciones en un lugar</span>
          </div>
        </div>
      </section>
      <!-- 4. Cómo funciona (27:201) -->
      <section id="como-funciona" class="myt-landing__steps" data-node-id="27:201">
        <div class="myt-landing__container">
          <div class="myt-landing__section-head">
            <h2>De la duda a la clase en tres pasos</h2>
            <p>MyT reúne búsqueda, coordinación y agenda en un solo lugar.</p>
          </div>

          <div class="myt-landing__steps-grid">
            <article class="myt-step-card">
              <span class="myt-step-card__num">01</span>
              <h3>Encuentra</h3>
              <p>Busca por materia, tarifa, modalidad, experiencia y disponibilidad.</p>
            </article>

            <article class="myt-step-card">
              <span class="myt-step-card__num">02</span>
              <h3>Compara y reserva</h3>
              <p>Revisa perfiles, calificaciones y horarios antes de enviar la solicitud.</p>
            </article>

            <article class="myt-step-card">
              <span class="myt-step-card__num">03</span>
              <h3>Aprende</h3>
              <p>
                Coordina los detalles, recibe recordatorios y gestiona tu sesión desde el
                calendario.
              </p>
            </article>
          </div>
        </div>
      </section>

      <!-- 5. Gestión / Tu semana en MyT (30:137) -->
      <section class="myt-landing__management" data-node-id="30:137">
        <div class="myt-landing__management-inner">
          <div class="myt-week-board" aria-label="Ejemplo ilustrativo de agenda semanal">
            <div class="myt-week-board__tape" aria-hidden="true"></div>
            <h3>Tu semana en MyT</h3>

            <div class="myt-week-board__cols">
              @for (dia of diasSemanaEjemplo; track dia.dia) {
                <div class="myt-week-col">
                  <span class="myt-week-col__day">{{ dia.dia }}</span>
                  @if (dia.materia) {
                    <a
                      [routerLink]="auth.sesion() ? '/calendario' : '/tutores'"
                      class="myt-week-pill"
                      [class.myt-week-pill--teal]="dia.tono === 'teal'"
                      [class.myt-week-pill--slate]="dia.tono === 'slate'"
                    >
                      <strong>{{ dia.materia }}</strong>
                      <small>{{ dia.hora }}</small>
                    </a>
                  }
                </div>
              }
            </div>
          </div>

          <div class="myt-landing__management-copy">
            <h2>Todo lo importante, sin perder el hilo.</h2>
            <p class="myt-landing__management-lead">
              Las solicitudes, mensajes, confirmaciones y cambios de horario quedan vinculados a
              cada tutoría.
            </p>
            <ul class="myt-feature-list">
              <li>
                <img
                  src="/assets/bullet-dot.svg"
                  width="10"
                  height="10"
                  alt=""
                  aria-hidden="true"
                />
                <div>
                  <strong>Agenda compartida</strong>
                  <span>La sesión aparece en el calendario de ambas partes.</span>
                </div>
              </li>
              <li>
                <img
                  src="/assets/bullet-dot.svg"
                  width="10"
                  height="10"
                  alt=""
                  aria-hidden="true"
                />
                <div>
                  <strong>Recordatorios oportunos</strong>
                  <span>Recibe avisos antes de cada clase y cuando exista un cambio.</span>
                </div>
              </li>
              <li>
                <img
                  src="/assets/bullet-dot.svg"
                  width="10"
                  height="10"
                  alt=""
                  aria-hidden="true"
                />
                <div>
                  <strong>Historial y reputación</strong>
                  <span>Consulta sesiones anteriores y publica reseñas verificadas.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 6. Tutores Destacados (30:175) -->
      <section id="para-tutores" class="myt-landing__tutors" data-node-id="30:175">
        <div class="myt-landing__container">
          <div class="myt-landing__section-head">
            <h2>
              {{
                destacados().length
                  ? 'Personas reales para retos reales'
                  : 'Lo que sabes puede abrir caminos'
              }}
            </h2>
            <p>
              {{
                destacados().length
                  ? 'Explora perfiles con experiencia, disponibilidad y reseñas verificadas.'
                  : 'Comparte tu conocimiento y acompaña a otros estudiantes a avanzar.'
              }}
            </p>
          </div>

          <div class="myt-landing__tutors-grid">
            @for (t of destacados(); track t.id) {
              <article class="myt-featured-tutor">
                <span class="myt-featured-tutor__avatar">{{ t.nombre.charAt(0) }}</span>
                <h3>{{ t.nombre }}</h3>
                <p>{{ t.biografia }}</p>
                @if (t.calificacion !== null) {
                  <p>★ {{ t.calificacion | number: '1.1-1' }}</p>
                }
                <div class="myt-featured-tutor__footer">
                  <strong
                    >{{ t.tarifaPorHora | currency: 'COP' : 'symbol' : '1.0-0' }} / hora</strong
                  ><a [routerLink]="['/tutores', t.id]">Ver perfil →</a>
                </div>
              </article>
            } @empty {
              <div class="myt-landing__teach">
                <app-lucide-icon name="graduation-cap" [size]="36" />
                <div>
                  <h3>Enseña a tu manera</h3>
                  <p>
                    Crea tu perfil, presenta tus materias y define tus tarifas y disponibilidad.
                  </p>
                </div>
                <a
                  routerLink="/registro"
                  [queryParams]="{ rol: 'TUTOR' }"
                  class="myt-landing__btn myt-landing__btn--primary"
                  >Quiero ser tutor</a
                >
              </div>
            }
          </div>
        </div>
      </section>

      <!-- 7. CTA Band (30:205) -->
      <section class="myt-landing__cta" data-node-id="30:205">
        <div class="myt-landing__cta-inner">
          <h2>Encuentra el apoyo que necesitas para avanzar.</h2>
          <p>Explora tutores, compara opciones y agenda tu primera sesión en MyT.</p>
          <a routerLink="/tutores" class="myt-landing__btn myt-landing__btn--paper">
            Empezar ahora
          </a>
        </div>
      </section>

      <!-- 8. Footer (30:210) -->
      <footer class="myt-landing__footer" data-node-id="30:210">
        <div class="myt-landing__footer-inner">
          <div class="myt-landing__footer-brand">
            <strong>MyT</strong>
            <p>Encuentra. Aprende. Avanza.</p>
          </div>
          <nav class="myt-landing__footer-links" aria-label="Enlaces legales">
            <a routerLink="/tutores">Explorar</a>
            <a routerLink="/calendario">Calendario</a>
            <a routerLink="/mensajes">Ayuda</a>
            <a routerLink="/mensajes">Contacto</a>
          </nav>
          <span class="myt-landing__copyright">© 2026 MyT</span>
        </div>
      </footer>

      <!-- Texture Overlay -->
      <div class="myt-landing__grain" aria-hidden="true"></div>
    </div>
  `,
})
export class LandingPageComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  readonly destacados = signal<TutorApi[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly revision = signal(0);

  readonly areasConocimiento: {
    nombre: string;
    descripcion: string;
    icono: LucideIconName;
  }[] = [
    {
      nombre: 'Matemáticas',
      descripcion: 'Cálculo, Álgebra y Estadística',
      icono: 'graduation-cap',
    },
    {
      nombre: 'Programación',
      descripcion: 'Algoritmos, Python y Desarrollo Web',
      icono: 'book-open',
    },
    {
      nombre: 'Idiomas',
      descripcion: 'Inglés académico y conversación',
      icono: 'message-square',
    },
  ];

  readonly diasSemanaEjemplo = [
    { dia: 'LUN 7', materia: '', hora: '', tono: '' },
    { dia: 'MAR 8', materia: 'Cálculo', hora: '4:00 p. m.', tono: 'teal' },
    { dia: 'MIÉ 9', materia: '', hora: '', tono: '' },
    { dia: 'JUE 10', materia: 'Inglés', hora: '6:00 p. m.', tono: 'slate' },
    { dia: 'VIE 11', materia: '', hora: '', tono: '' },
  ];
  constructor() {
    effect((onCleanup) => {
      this.revision();
      if (!this.auth.sesion()) {
        this.destacados.set([]);
        this.cargando.set(false);
        return;
      }
      this.cargando.set(true);
      this.error.set('');
      const consulta = this.api.tutores().subscribe({
        next: (p) => {
          this.destacados.set(p.content.slice(0, 3));
          this.cargando.set(false);
        },
        error: (e) => {
          this.destacados.set([]);
          this.error.set(mensajeHttp(e));
          this.cargando.set(false);
        },
      });
      onCleanup(() => consulta.unsubscribe());
    });
  }
  cargar() {
    this.revision.update((n) => n + 1);
  }
  readonly busquedaHero = signal('');

  buscarRapido(): void {
    const q = this.busquedaHero().trim();
    if (q) {
      void this.router.navigate(['/tutores'], { queryParams: { q } });
    } else {
      void this.router.navigate(['/tutores']);
    }
  }
}
