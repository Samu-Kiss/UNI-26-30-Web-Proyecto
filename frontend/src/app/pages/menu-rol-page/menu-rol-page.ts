import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

export type RolMenu = 'ESTUDIANTE' | 'TUTOR' | 'ADMINISTRADOR';

@Component({
  selector: 'app-menu-rol-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="myt-page-shell" aria-label="Menú por rol">
      <header class="myt-hero-banner">
        <div>
          <span class="myt-eyebrow">{{ etiquetaPanel() }}</span>
          <h1>Hola, {{ nombreUsuario() }}</h1>
          <p>{{ descripcionPanel() }}</p>
        </div>
        <div class="myt-role-switcher" role="tablist" aria-label="Vista previa de menús por rol">
          <button
            type="button"
            role="tab"
            class="myt-pill-tab"
            [class.myt-pill-tab--active]="rolVista() === 'ESTUDIANTE'"
            (click)="rolVista.set('ESTUDIANTE')"
          >
            Panel Estudiante
          </button>
          <button
            type="button"
            role="tab"
            class="myt-pill-tab"
            [class.myt-pill-tab--active]="rolVista() === 'TUTOR'"
            (click)="rolVista.set('TUTOR')"
          >
            Panel Tutor
          </button>
          <button
            type="button"
            role="tab"
            class="myt-pill-tab"
            [class.myt-pill-tab--active]="rolVista() === 'ADMINISTRADOR'"
            (click)="rolVista.set('ADMINISTRADOR')"
          >
            Panel Administrativo
          </button>
        </div>
      </header>

      @switch (rolVista()) {
        @case ('ESTUDIANTE') {
          <section class="myt-cards-grid" aria-label="Acciones de estudiante">
            <a routerLink="/tutores" class="myt-menu-card">
              <span class="myt-menu-card__tag">Explorar</span>
              <h2>Consultar tutores</h2>
              <p>Revisa los tutores disponibles, compara tarifas, horarios y reseñas reales.</p>
              <span class="myt-menu-card__cta">Ir a buscar tutores →</span>
            </a>

            <a routerLink="/reservas" class="myt-menu-card">
              <span class="myt-menu-card__tag">Reservas</span>
              <h2>Crear reserva</h2>
              <p>Programa una nueva sesión de tutoría paso a paso y elige tu modalidad.</p>
              <span class="myt-menu-card__cta">Reservar tutoría →</span>
            </a>

            <a routerLink="/reservas" class="myt-menu-card">
              <span class="myt-menu-card__tag">Seguimiento</span>
              <h2>Mis reservas</h2>
              <p>Consulta el estado de tus tutorías y cancela las que aún estén pendientes.</p>
              <span class="myt-menu-card__cta">Ver mis tutorías →</span>
            </a>

            <a routerLink="/calendario" class="myt-menu-card">
              <span class="myt-menu-card__tag">Agenda</span>
              <h2>Calendario semanal</h2>
              <p>Visualiza tus sesiones confirmadas, enlaces de reunión y próximas clases.</p>
              <span class="myt-menu-card__cta">Abrir calendario →</span>
            </a>

            <a routerLink="/mensajes" class="myt-menu-card">
              <span class="myt-menu-card__tag">Coordinación</span>
              <h2>Chat con tutores</h2>
              <p>Acuerda temas específicos, comparte talleres previos y coordina horarios.</p>
              <span class="myt-menu-card__cta">Abrir mensajes →</span>
            </a>

            <a routerLink="/resenas" class="myt-menu-card">
              <span class="myt-menu-card__tag">Calidad</span>
              <h2>Dejar reseña</h2>
              <p>Califica tus tutorías finalizadas para orientar a otros estudiantes de MyT.</p>
              <span class="myt-menu-card__cta">Calificar sesión →</span>
            </a>
          </section>
        }

        @case ('TUTOR') {
          <section class="myt-cards-grid" aria-label="Acciones de tutor">
            <a routerLink="/reservas" class="myt-menu-card">
              <span class="myt-menu-card__tag">Solicitudes</span>
              <h2>Mis reservas</h2>
              <p>Acepta o rechaza reservas pendientes y revisa el historial de tus tutorías.</p>
              <span class="myt-menu-card__cta">Gestionar reservas →</span>
            </a>

            <a routerLink="/tutores/1" class="myt-menu-card">
              <span class="myt-menu-card__tag">Perfil público</span>
              <h2>Mi perfil de tutor</h2>
              <p>Consulta cómo ven los estudiantes tu biografía, experiencia, tarifas y reseñas.</p>
              <span class="myt-menu-card__cta">Ver perfil público →</span>
            </a>

            <a routerLink="/calendario" class="myt-menu-card">
              <span class="myt-menu-card__tag">Disponibilidad</span>
              <h2>Calendario de sesiones</h2>
              <p>Administra tus bloques de disponibilidad semanal y sesiones agendadas.</p>
              <span class="myt-menu-card__cta">Ir al calendario →</span>
            </a>

            <a routerLink="/mensajes" class="myt-menu-card">
              <span class="myt-menu-card__tag">Estudiantes</span>
              <h2>Mensajes de coordinación</h2>
              <p>Responde dudas previas de los estudiantes y comparte material de estudio.</p>
              <span class="myt-menu-card__cta">Ver conversaciones →</span>
            </a>
          </section>
        }

        @case ('ADMINISTRADOR') {
          <section class="myt-cards-grid" aria-label="Acciones administrativas">
            <a routerLink="/usuarios" class="myt-menu-card">
              <span class="myt-menu-card__tag">Gestión central</span>
              <h2>Clientes y Usuarios</h2>
              <p>Crea, edita, activa o desactiva usuarios, asigna perfiles y prueba el laboratorio RxJS.</p>
              <span class="myt-menu-card__cta">Administrar usuarios →</span>
            </a>

            <a routerLink="/estudiantes" class="myt-menu-card">
              <span class="myt-menu-card__tag">Académico</span>
              <h2>Estudiantes</h2>
              <p>Consulta los datos académicos de los estudiantes registrados (universidad, programa y semestre).</p>
              <span class="myt-menu-card__cta">Ver directorio de estudiantes →</span>
            </a>

            <a routerLink="/tutores" class="myt-menu-card">
              <span class="myt-menu-card__tag">Catálogo</span>
              <h2>Tutores</h2>
              <p>Administra la información de los tutores, sus tarifas, biografías y perfiles activos.</p>
              <span class="myt-menu-card__cta">Gestionar tutores →</span>
            </a>

            <a routerLink="/reservas" class="myt-menu-card">
              <span class="myt-menu-card__tag">Operación</span>
              <h2>Reservas</h2>
              <p>Supervisa las reservas registradas en el sistema, sus estados y motivos de cancelación.</p>
              <span class="myt-menu-card__cta">Supervisar reservas →</span>
            </a>

            <a routerLink="/administradores" class="myt-menu-card">
              <span class="myt-menu-card__tag">Seguridad</span>
              <h2>Administradores</h2>
              <p>Revisa las cuentas con acceso administrativo, su correo institucional y estado actual.</p>
              <span class="myt-menu-card__cta">Ver administradores →</span>
            </a>
          </section>
        }
      }
    </main>
  `,
  styles: [
    `
      .myt-page-shell {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .myt-hero-banner {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 20px;
        padding: 1.75rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1.25rem;
        flex-wrap: wrap;
      }
      .myt-eyebrow {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #1985a1;
        background: #ddecef;
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
      }
      .myt-hero-banner h1 {
        margin: 0.55rem 0 0.25rem;
        font-size: 1.85rem;
        color: #46494c;
      }
      .myt-hero-banner p {
        margin: 0;
        color: #4c5c68;
        font-size: 0.95rem;
      }
      .myt-role-switcher {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .myt-pill-tab {
        padding: 0.5rem 0.95rem;
        border-radius: 999px;
        border: 1px solid #c5c3c6;
        background: #ffffff;
        color: #46494c;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
      }
      .myt-pill-tab--active {
        background: #1985a1;
        border-color: #1985a1;
        color: #f5f5f3;
      }
      .myt-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
        gap: 1.25rem;
      }
      .myt-menu-card {
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 18px;
        padding: 1.5rem;
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
        transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
      }
      .myt-menu-card:hover {
        transform: translateY(-2px);
        border-color: #1985a1;
        box-shadow: 0 10px 24px rgba(25, 133, 161, 0.1);
        text-decoration: none;
      }
      .myt-menu-card__tag {
        align-self: flex-start;
        font-size: 0.72rem;
        font-weight: 700;
        color: #1985a1;
        background: #ddecef;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
      }
      .myt-menu-card h2 {
        margin: 0.2rem 0 0;
        font-size: 1.2rem;
        color: #46494c;
      }
      .myt-menu-card p {
        margin: 0;
        font-size: 0.88rem;
        color: #4c5c68;
        line-height: 1.45;
        flex: 1;
      }
      .myt-menu-card__cta {
        margin-top: 0.5rem;
        font-size: 0.84rem;
        font-weight: 700;
        color: #1985a1;
      }
    `,
  ],
})
export class MenuRolPageComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly rolVista = signal<RolMenu>('ESTUDIANTE');

  readonly nombreUsuario = computed(() => this.auth.sesion()?.nombreUsuario ?? 'Usuario MyT');

  readonly etiquetaPanel = computed(() => {
    const r = this.rolVista();
    if (r === 'TUTOR') return 'Panel de tutor';
    if (r === 'ADMINISTRADOR') return 'Panel administrativo';
    return 'Panel de estudiante';
  });

  readonly descripcionPanel = computed(() => {
    const r = this.rolVista();
    if (r === 'TUTOR') return 'Consulta las solicitudes de reserva y administra tus tutorías.';
    if (r === 'ADMINISTRADOR') return 'Selecciona el módulo que deseas consultar o administrar.';
    return 'Gestiona tus reservas y consulta los tutores disponibles.';
  });

  constructor() {
    const dataRol = this.route.snapshot.data['rol'] as RolMenu | undefined;
    const sesionRol = this.auth.sesion()?.rol as RolMenu | undefined;
    if (dataRol) {
      this.rolVista.set(dataRol);
    } else if (sesionRol) {
      this.rolVista.set(sesionRol);
    }
  }
}
