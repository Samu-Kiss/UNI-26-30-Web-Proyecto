import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, ReservaApi, TutorApi, mensajeHttp } from '../../core/services/api.service';
import { catchError, EMPTY, finalize, merge, switchMap, timer } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';

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

              <h2>Tutores disponibles</h2>
              @if (cargando()) {
                <p role="status">Cargando tutores…</p>
              }
              @if (error()) {
                <p role="alert">{{ error() }}</p>
                <button (click)="cargar()">Reintentar</button>
              }
              <div class="myt-landing__preview-list">
                @for (t of destacados(); track t.id) {
                  <a [routerLink]="['/tutores', t.id]" class="myt-landing__tutor-mini"
                    ><span class="myt-landing__mini-avatar">{{ t.nombre.charAt(0) }}</span>
                    <div class="myt-landing__mini-info">
                      <strong>{{ t.nombre }}</strong
                      ><small
                        >{{ t.tarifaPorHora | currency: 'COP' : 'symbol' : '1.0-0' }} / hora
                        @if (t.calificacion !== null) {
                          · ★ {{ t.calificacion | number: '1.1-1' }}
                        }
                      </small>
                    </div></a
                  >
                } @empty {
                  @if (!cargando() && !error()) {
                    <p>
                      {{
                        auth.sesion()
                          ? 'No hay tutores disponibles.'
                          : 'Inicia sesión para consultar los perfiles y sus horarios.'
                      }}
                    </p>
                  }
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
          <div class="myt-week-board">
            <div class="myt-week-board__tape" aria-hidden="true"></div>
            <h3>Próximas tutorías</h3>
            @if (!auth.sesion()) {
              <p>Inicia sesión para consultar tus próximas tutorías.</p>
              <a routerLink="/login" class="myt-landing__btn myt-landing__btn--outline"
                >Iniciar sesión</a
              >
            } @else if (cargandoReservas()) {
              <p role="status">Cargando próximas tutorías…</p>
            } @else if (errorReservas()) {
              <p role="alert">{{ errorReservas() }}</p>
              <button type="button" (click)="cargar()">Reintentar próximas tutorías</button>
            } @else {
              <div class="myt-upcoming-list">
                @for (r of proximas(); track r.id) {
                  <a [routerLink]="['/reservas', r.id]" class="myt-upcoming-list__item">
                    <strong>{{ r.materia }}</strong>
                    <span>{{ r.fecha }} · {{ r.horaInicio.slice(0, 5) }} · {{ r.estado }}</span>
                  </a>
                } @empty {
                  <p>No tienes próximas tutorías.</p>
                }
              </div>
              <a routerLink="/reservas">Ver reservas</a>
            }
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
            <h2>Personas reales para retos reales</h2>
            <p>Explora perfiles con experiencia, disponibilidad y reseñas verificadas.</p>
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
              <p>Consulta el catálogo para encontrar un tutor según tus objetivos.</p>
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
  readonly proximas = signal<ReservaApi[]>([]);
  readonly cargandoReservas = signal(false);
  readonly errorReservas = signal('');
  constructor() {
    effect((onCleanup) => {
      this.revision();
      const sesion = this.auth.sesion();
      this.proximas.set([]);
      this.errorReservas.set('');
      this.cargandoReservas.set(!!sesion);
      if (!sesion) return;
      const consulta = merge(timer(0, 30000), this.api.cambios)
        .pipe(
          switchMap(() => {
            this.cargandoReservas.set(true);
            this.errorReservas.set('');
            this.proximas.set([]);
            return this.api.reservas().pipe(
              catchError((e) => {
                this.errorReservas.set(mensajeHttp(e));
                return EMPTY;
              }),
              finalize(() => this.cargandoReservas.set(false)),
            );
          }),
        )
        .subscribe((reservas) => {
          const ahora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' });
          this.proximas.set(
            reservas
              .filter(
                (r) =>
                  ['PENDIENTE', 'CONFIRMADA', 'EN_CURSO'].includes(r.estado) &&
                  `${r.fecha} ${r.horaInicio}` >= ahora,
              )
              .sort((a, b) =>
                `${a.fecha} ${a.horaInicio}`.localeCompare(`${b.fecha} ${b.horaInicio}`),
              )
              .slice(0, 3),
          );
        });
      onCleanup(() => consulta.unsubscribe());
    });
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
