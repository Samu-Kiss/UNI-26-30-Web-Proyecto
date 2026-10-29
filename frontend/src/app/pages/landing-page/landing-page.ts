import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, FormsModule, LucideIconComponent],
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
              <a routerLink="/tutores" class="myt-landing__btn myt-landing__btn--outline">
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

              <h2>Tutores recomendados</h2>

              <div class="myt-landing__preview-list">
                <a routerLink="/tutores/1" class="myt-landing__tutor-mini">
                  <span class="myt-landing__mini-avatar">L</span>
                  <div class="myt-landing__mini-info">
                    <strong>Laura Mendoza</strong>
                    <small>Cálculo y Física · ★ 4,9 · $45.000/h</small>
                  </div>
                </a>

                <a routerLink="/tutores/2" class="myt-landing__tutor-mini">
                  <span class="myt-landing__mini-avatar">A</span>
                  <div class="myt-landing__mini-info">
                    <strong>Andrés Torres</strong>
                    <small>Programación · ★ 4,8 · $50.000/h</small>
                  </div>
                </a>

                <a routerLink="/tutores/3" class="myt-landing__tutor-mini">
                  <span class="myt-landing__mini-avatar">C</span>
                  <div class="myt-landing__mini-info">
                    <strong>Camila Rojas</strong>
                    <small>Inglés académico · ★ 4,9 · $42.000/h</small>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Trust Metrics Strip (27:188) -->
      <section class="myt-landing__trust" aria-label="Indicadores de confianza" data-node-id="27:188">
        <div class="myt-landing__trust-inner">
          <div class="myt-landing__metric">
            <strong>+250</strong>
            <span>Tutores verificados</span>
          </div>
          <div class="myt-landing__metric">
            <strong>4,9/5</strong>
            <span>Calificación promedio</span>
          </div>
          <div class="myt-landing__metric">
            <strong>12 min</strong>
            <span>Para encontrar y reservar</span>
          </div>
          <div class="myt-landing__metric">
            <strong>100%</strong>
            <span>Agenda centralizada</span>
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
          <div class="myt-week-board">
            <div class="myt-week-board__tape" aria-hidden="true"></div>
            <h3>Tu semana en MyT</h3>
            <div class="myt-week-board__cols">
              <div class="myt-week-col">
                <span class="myt-week-col__day">LUN 7</span>
              </div>
              <div class="myt-week-col">
                <span class="myt-week-col__day">MAR 8</span>
                <a routerLink="/reservas/1" class="myt-week-pill myt-week-pill--teal">
                  <strong>Cálculo</strong>
                  <small>4:00 p. m.</small>
                </a>
              </div>
              <div class="myt-week-col">
                <span class="myt-week-col__day">MIÉ 9</span>
              </div>
              <div class="myt-week-col">
                <span class="myt-week-col__day">JUE 10</span>
                <a routerLink="/reservas/3" class="myt-week-pill myt-week-pill--slate">
                  <strong>Inglés</strong>
                  <small>6:00 p. m.</small>
                </a>
              </div>
              <div class="myt-week-col">
                <span class="myt-week-col__day">VIE 11</span>
              </div>
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
                <img src="/assets/bullet-dot.svg" width="10" height="10" alt="" aria-hidden="true" />
                <div>
                  <strong>Agenda compartida</strong>
                  <span>La sesión aparece en el calendario de ambas partes.</span>
                </div>
              </li>
              <li>
                <img src="/assets/bullet-dot.svg" width="10" height="10" alt="" aria-hidden="true" />
                <div>
                  <strong>Recordatorios oportunos</strong>
                  <span>Recibe avisos antes de cada clase y cuando exista un cambio.</span>
                </div>
              </li>
              <li>
                <img src="/assets/bullet-dot.svg" width="10" height="10" alt="" aria-hidden="true" />
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
            <h2>Personas reales para retos reales</h2>
            <p>Explora perfiles con experiencia, disponibilidad y reseñas verificadas.</p>
          </div>

          <div class="myt-landing__tutors-grid">
            <article class="myt-featured-tutor">
              <span class="myt-featured-tutor__avatar">L</span>
              <h3>Laura Mendoza</h3>
              <p class="myt-featured-tutor__subject">Cálculo y Física</p>
              <p class="myt-featured-tutor__rating">★ 4,9 · 80+ reseñas</p>
              <div class="myt-featured-tutor__footer">
                <strong>$45.000 COP/h</strong>
                <a routerLink="/tutores/1">Ver perfil →</a>
              </div>
            </article>

            <article class="myt-featured-tutor">
              <span class="myt-featured-tutor__avatar">A</span>
              <h3>Andrés Torres</h3>
              <p class="myt-featured-tutor__subject">Programación y datos</p>
              <p class="myt-featured-tutor__rating">★ 4,8 · 80+ reseñas</p>
              <div class="myt-featured-tutor__footer">
                <strong>$50.000 COP/h</strong>
                <a routerLink="/tutores/2">Ver perfil →</a>
              </div>
            </article>

            <article class="myt-featured-tutor">
              <span class="myt-featured-tutor__avatar">C</span>
              <h3>Camila Rojas</h3>
              <p class="myt-featured-tutor__subject">Inglés académico</p>
              <p class="myt-featured-tutor__rating">★ 4,9 · 80+ reseñas</p>
              <div class="myt-featured-tutor__footer">
                <strong>$42.000 COP/h</strong>
                <a routerLink="/tutores/3">Ver perfil →</a>
              </div>
            </article>
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
