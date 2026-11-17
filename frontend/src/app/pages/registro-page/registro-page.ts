import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RegistroUsuario } from '../../core/models/usuario.model';
import { mensajeHttp } from '../../core/services/api.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { BrandMarkComponent } from '../../shared/components/atoms/brand-mark/brand-mark';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';

@Component({
  selector: 'app-registro-page',
  standalone: true,
  imports: [FormsModule, RouterLink, BrandMarkComponent, LucideIconComponent],
  template: `
    <div class="myt-login-viewport">
      <div class="myt-paper-grain" aria-hidden="true"></div>
      <main class="myt-login-shell app-container laboratorio-page">
        <a routerLink="/" class="myt-login-back">
          <app-lucide-icon name="arrow-left" [size]="16" />
          <span>Volver al inicio</span>
        </a>

        <section class="myt-login-card card card__body">
          <div class="myt-login-brand">
            <app-brand-mark />
            <div>
              <span class="myt-eyebrow">Únete a MyT</span>
              <h1>Crear una cuenta</h1>
              <p class="myt-subtitle">Regístrate como estudiante o tutor en pocos minutos.</p>
            </div>
          </div>

          @if (error()) {
            <p class="myt-alert myt-alert--error" role="alert">{{ error() }}</p>
          }
          @if (exito()) {
            <div class="myt-alert myt-alert--success" role="status">
              <p><strong>¡Cuenta creada exitosamente!</strong></p>
              <p>Ya puedes ingresar con tu correo y contraseña.</p>
              <a routerLink="/login" class="btn btn--primary btn--sm myt-btn myt-btn--primary">
                Ir al inicio de sesión
              </a>
            </div>
          } @else {
            <form class="myt-register-form" (ngSubmit)="registrar()">
              <!-- Selector de rol -->
              <div class="myt-role-selector" role="radiogroup" aria-label="Tipo de cuenta">
                <button
                  type="button"
                  class="myt-role-btn"
                  [class.myt-role-btn--active]="rolSeleccionado() === 'ESTUDIANTE'"
                  (click)="seleccionarRol('ESTUDIANTE')"
                >
                  <app-lucide-icon name="graduation-cap" [size]="20" />
                  <div>
                    <strong>Estudiante</strong>
                    <span>Busco tutores y apoyo académico</span>
                  </div>
                </button>
                <button
                  type="button"
                  class="myt-role-btn"
                  [class.myt-role-btn--active]="rolSeleccionado() === 'TUTOR'"
                  (click)="seleccionarRol('TUTOR')"
                >
                  <app-lucide-icon name="book-open" [size]="20" />
                  <div>
                    <strong>Tutor</strong>
                    <span>Quiero enseñar y ofrecer asesorías</span>
                  </div>
                </button>
              </div>

              <!-- Datos personales -->
              <div class="myt-form-grid-2">
                <label class="form-field">
                  <span class="form-label">Nombre</span>
                  <input
                    class="text-input"
                    type="text"
                    name="nombre"
                    [(ngModel)]="datos.nombre"
                    required
                    placeholder="Ej. Sofía"
                  />
                </label>
                <label class="form-field">
                  <span class="form-label">Apellido</span>
                  <input
                    class="text-input"
                    type="text"
                    name="apellido"
                    [(ngModel)]="datos.apellido"
                    required
                    placeholder="Ej. Gómez"
                  />
                </label>
              </div>

              <div class="myt-form-grid-2">
                <label class="form-field">
                  <span class="form-label">Correo electrónico</span>
                  <input
                    class="text-input"
                    type="email"
                    name="correo"
                    [(ngModel)]="datos.correo"
                    required
                    placeholder="nombre@correo.edu.co"
                  />
                </label>
                <label class="form-field">
                  <span class="form-label">Teléfono</span>
                  <input
                    class="text-input"
                    type="tel"
                    name="telefono"
                    [(ngModel)]="datos.telefono"
                    pattern="([+]57)?[0-9]{10}"
                    #tel="ngModel"
                    placeholder="300 123 4567"
                  />
                  @if (tel.invalid && (tel.dirty || tel.touched)) {
                    <small role="alert"
                      >Ingresa 10 dígitos, opcionalmente precedidos por +57.</small
                    >
                  }
                </label>
              </div>

              <label class="form-field">
                <span class="form-label">Contraseña (mínimo 8 caracteres)</span>
                <input
                  class="text-input"
                  type="password"
                  name="contrasena"
                  [(ngModel)]="datos.contrasena"
                  required
                  minlength="8"
                  placeholder="••••••••"
                />
              </label>

              <!-- Campos específicos para Estudiante -->
              @if (rolSeleccionado() === 'ESTUDIANTE') {
                <div class="myt-extra-fields">
                  <div class="myt-form-grid-2">
                    <label class="form-field">
                      <span class="form-label">Código estudiantil</span>
                      <input
                        class="text-input"
                        type="text"
                        name="codigoEstudiantil"
                        [(ngModel)]="datos.codigoEstudiantil"
                        placeholder="Ej. 20261020"
                      />
                    </label>
                    <label class="form-field">
                      <span class="form-label">Semestre actual</span>
                      <input
                        class="text-input"
                        type="number"
                        name="semestre"
                        [(ngModel)]="datos.semestre"
                        min="1"
                        max="20"
                        placeholder="5"
                      />
                    </label>
                  </div>
                  <div class="myt-form-grid-2">
                    <label class="form-field">
                      <span class="form-label">Universidad</span>
                      <input
                        class="text-input"
                        type="text"
                        name="universidad"
                        [(ngModel)]="datos.universidad"
                        placeholder="Ej. Pontificia Universidad Javeriana"
                      />
                    </label>
                    <label class="form-field">
                      <span class="form-label">Programa académico</span>
                      <input
                        class="text-input"
                        type="text"
                        name="programaAcademico"
                        [(ngModel)]="datos.programaAcademico"
                        placeholder="Ej. Ingeniería de Sistemas"
                      />
                    </label>
                  </div>
                </div>
              }

              <!-- Campos específicos para Tutor -->
              @if (rolSeleccionado() === 'TUTOR') {
                <div class="myt-extra-fields">
                  <div class="myt-form-grid-2">
                    <label class="form-field">
                      <span class="form-label">Tarifa por hora (COP)</span>
                      <input
                        class="text-input"
                        type="number"
                        name="tarifaPorHora"
                        [(ngModel)]="datos.tarifaPorHora"
                        min="5000"
                        step="1000"
                        placeholder="45000"
                      />
                    </label>
                    <label class="form-field">
                      <span class="form-label">Materias que enseñas</span>
                      <input
                        class="text-input"
                        type="text"
                        name="materias"
                        [(ngModel)]="datos.materias"
                        placeholder="Cálculo diferencial, Física, Programación"
                      />
                    </label>
                  </div>
                  <label class="form-field">
                    <span class="form-label">Biografía académica y experiencia</span>
                    <textarea
                      class="text-input"
                      name="biografia"
                      rows="3"
                      [(ngModel)]="datos.biografia"
                      placeholder="Cuéntale a los estudiantes tu metodología y experiencia académica…"
                    ></textarea>
                  </label>
                </div>
              }

              <button
                type="submit"
                class="btn btn--primary btn--md myt-btn myt-btn--primary"
                [disabled]="guardando()"
              >
                {{ guardando() ? 'Creando cuenta…' : 'Crear mi cuenta' }}
              </button>
            </form>

            <div class="myt-login-footer">
              <p>
                ¿Ya tienes una cuenta registrada?
                <a routerLink="/login">Inicia sesión aquí</a>.
              </p>
            </div>
          }
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      .myt-login-viewport {
        min-height: 100vh;
        background: var(--color-bg-body);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2.5rem 1.25rem;
        position: relative;
      }
      .myt-login-shell {
        width: 100%;
        max-width: 620px;
        margin: 0 auto;
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .myt-login-back {
        align-self: flex-start;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--color-text-subtle);
        text-decoration: none;
      }
      .myt-login-back:hover {
        color: var(--color-primary);
      }
      .myt-login-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        padding: 2.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        box-shadow: var(--shadow-card);
      }
      .myt-login-brand {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .myt-login-brand h1 {
        margin: 0.25rem 0 0.15rem;
        font-size: 1.7rem;
        color: var(--color-text-main);
      }
      .myt-register-form {
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
      }
      .myt-role-selector {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
      .myt-role-btn {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem 1rem;
        border: 2px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface-pure);
        cursor: pointer;
        text-align: left;
        color: var(--color-text-main);
        transition: var(--transition-base);
      }
      .myt-role-btn:hover {
        border-color: var(--color-primary);
      }
      .myt-role-btn--active {
        border-color: var(--color-primary);
        background: var(--color-primary-light);
        color: var(--color-primary);
      }
      .myt-role-btn strong {
        display: block;
        font-size: 0.95rem;
      }
      .myt-role-btn span {
        display: block;
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }
      .myt-role-btn--active span {
        color: var(--color-primary);
      }
      .myt-form-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.85rem;
      }
      .myt-extra-fields {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        padding: 1rem;
        border-radius: var(--radius-md);
        background: var(--color-bg-muted);
        border: 1px solid var(--color-border);
      }
      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .form-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text-main);
      }
      .text-input {
        padding: 0.65rem 0.85rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border-strong);
        font-size: 0.9rem;
        background: var(--color-surface-pure);
        color: var(--color-text-main);
      }
      .text-input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: var(--focus-ring);
      }
      .myt-login-footer {
        padding-top: 0.75rem;
        border-top: 1px solid var(--color-border);
        font-size: 0.85rem;
        color: var(--color-text-subtle);
      }
      .myt-login-footer a {
        color: var(--color-primary);
        font-weight: 700;
        text-decoration: none;
      }
    `,
  ],
})
export class RegistroPageComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly rolSeleccionado = signal<'ESTUDIANTE' | 'TUTOR'>('ESTUDIANTE');
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly exito = signal(false);

  datos: RegistroUsuario = {
    nombre: '',
    apellido: '',
    correo: '',
    contrasena: '',
    telefono: '',
    rol: 'ESTUDIANTE',
    activo: true,
    roles: ['ESTUDIANTE'],
    codigoEstudiantil: '',
    universidad: '',
    programaAcademico: '',
    semestre: '1',
    biografia: '',
    materias: '',
    tarifaPorHora: '45000',
  };

  ngOnInit(): void {
    const rolParam = this.route.snapshot.queryParamMap.get('rol');
    if (rolParam === 'TUTOR') {
      this.seleccionarRol('TUTOR');
    }
  }

  seleccionarRol(rol: 'ESTUDIANTE' | 'TUTOR'): void {
    this.rolSeleccionado.set(rol);
    this.datos.rol = rol;
    this.datos.roles = [rol];
  }

  registrar(): void {
    if (this.guardando()) return;
    this.error.set('');

    if (!this.datos.nombre.trim() || !this.datos.apellido.trim() || !this.datos.correo.trim()) {
      this.error.set('Por favor completa tu nombre, apellido y correo.');
      return;
    }
    if (!this.datos.contrasena || this.datos.contrasena.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (this.datos.telefono && !/^(\+57)?[0-9]{10}$/.test(this.datos.telefono)) {
      this.error.set('Ingresa un teléfono de 10 dígitos, opcionalmente precedido por +57.');
      return;
    }
    this.guardando.set(true);
    this.usuarioService
      .guardar(this.datos)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.exito.set(true);
        },
        error: (e) => {
          this.error.set(mensajeHttp(e));
        },
      });
  }
}
