import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MytStateService } from '../../core/services/myt-state.service';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';

@Component({
  selector: 'app-mensajes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AvatarComponent],
  template: `
    <main class="myt-chat-layout" aria-label="Chat de coordinación">
      <!-- Conversation List -->
      <aside class="myt-chat-sidebar" aria-label="Conversaciones">
        <header class="myt-chat-sidebar__header">
          <h1>Mensajes</h1>
          <label class="myt-search-box" aria-label="Buscar conversación">
            <span class="myt-search-box__icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              [ngModel]="busqueda()"
              (ngModelChange)="busqueda.set($event)"
              placeholder="Buscar conversación"
            />
          </label>
        </header>

        <ul class="myt-chat-list" role="listbox" aria-label="Lista de conversaciones">
          @for (conv of conversacionesFiltradas(); track conv.id) {
            <li>
              <button
                type="button"
                class="myt-chat-item"
                [class.myt-chat-item--active]="conv.id === conversacionActiva().id"
                (click)="seleccionarConversacion(conv.id)"
              >
                <app-avatar
                  [name]="conv.nombre"
                  [initials]="conv.inicial"
                  size="md"
                />
                <div class="myt-chat-item__body">
                  <div class="myt-chat-item__top">
                    <strong>{{ conv.nombre }}</strong>
                    <span class="myt-chat-item__time">{{ conv.ultimaHora }}</span>
                  </div>
                  <p class="myt-chat-item__preview">{{ conv.ultimoMensaje }}</p>
                </div>
              </button>
            </li>
          } @empty {
            <li class="myt-empty-inline">No se encontraron conversaciones.</li>
          }
        </ul>
      </aside>

      <!-- Active Chat Panel -->
      <section class="myt-chat-main" aria-label="Conversación activa">
        @if (conversacionActiva(); as activa) {
          <header class="myt-chat-header">
            <div class="myt-chat-header__tutor">
              <app-avatar
                [name]="activa.nombre"
                [initials]="activa.inicial"
                size="md"
              />
              <div>
                <h2>{{ activa.nombre }} · {{ activa.materias }}</h2>
                <p class="myt-online-status">
                  ● {{ activa.enLinea ? 'En línea' : 'Disponible' }} · {{ activa.tiempoRespuesta }}
                </p>
              </div>
            </div>
            <div class="myt-chat-header__actions">
              <a [routerLink]="['/tutores', activa.tutorId]" class="myt-btn myt-btn--secondary myt-btn--sm">
                Ver perfil
              </a>
            </div>
          </header>

          <!-- Session Context Banner -->
          <div class="myt-chat-context" role="region" aria-label="Contexto de la tutoría">
            <p>
              <strong>{{ activa.contextoEstado }}:</strong> {{ activa.contextoDetalle }}
            </p>
            <a [routerLink]="['/reservas', activa.reservaId]" class="myt-link-teal">Cambiar horario</a>
          </div>

          <!-- Messages Stream -->
          <div class="myt-chat-messages" role="log" aria-live="polite">
            @for (msg of activa.mensajes; track msg.id) {
              <article
                class="myt-bubble"
                [class.myt-bubble--incoming]="msg.autor === 'TUTOR'"
                [class.myt-bubble--outgoing]="msg.autor === 'ESTUDIANTE'"
              >
                <p class="myt-bubble__text">{{ msg.texto }}</p>
                <span class="myt-bubble__meta">{{ msg.hora }}</span>
              </article>
            }
          </div>

          <!-- Composer -->
          <form class="myt-chat-composer" (ngSubmit)="enviarMensaje()">
            <input
              type="text"
              name="nuevoMensaje"
              [(ngModel)]="nuevoMensaje"
              placeholder="Escribe un mensaje…"
              aria-label="Escribe un mensaje"
              required
            />
            <button type="submit" class="myt-btn myt-btn--primary" [disabled]="!nuevoMensaje.trim()">
              Enviar
            </button>
          </form>
        }
      </section>
    </main>
  `,
  styles: [
    `
      .myt-chat-layout {
        display: grid;
        grid-template-columns: 360px 1fr;
        min-height: calc(100vh - 110px);
        background: #f5f5f3;
        border: 1px solid #dcdcdd;
        border-radius: 18px;
        overflow: hidden;
      }
      @media (max-width: 960px) {
        .myt-chat-layout {
          grid-template-columns: 1fr;
        }
      }
      .myt-chat-sidebar {
        background: #e9e9ea;
        border-right: 1px solid #dcdcdd;
        padding: 1.5rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .myt-chat-sidebar__header h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #46494c;
        margin: 0 0 0.85rem;
      }
      .myt-search-box {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #f5f5f3;
        border: 1px solid #c5c3c6;
        border-radius: 12px;
        padding: 0.55rem 0.85rem;
      }
      .myt-search-box__icon {
        color: #6f7479;
        font-size: 0.95rem;
      }
      .myt-search-box input {
        border: 0;
        background: transparent;
        width: 100%;
        color: #46494c;
        font-size: 0.9rem;
        outline: none;
      }
      .myt-chat-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .myt-chat-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem;
        border-radius: 14px;
        border: 1px solid transparent;
        background: #f5f5f3;
        text-align: left;
        cursor: pointer;
        transition: border-color 150ms ease, background 150ms ease;
      }
      .myt-chat-item:hover {
        border-color: #c5c3c6;
      }
      .myt-chat-item--active {
        background: #ffffff;
        border-color: #1985a1;
        box-shadow: 0 4px 12px rgba(25, 133, 161, 0.08);
      }
      .myt-chat-item__body {
        flex: 1;
        min-width: 0;
      }
      .myt-chat-item__top {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.5rem;
      }
      .myt-chat-item__top strong {
        font-size: 0.92rem;
        color: #46494c;
      }
      .myt-chat-item__time {
        font-size: 0.72rem;
        color: #6f7479;
      }
      .myt-chat-item__preview {
        margin: 0.25rem 0 0;
        font-size: 0.8rem;
        color: #4c5c68;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .myt-chat-main {
        display: flex;
        flex-direction: column;
        background: #f5f5f3;
      }
      .myt-chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.15rem 1.75rem;
        border-bottom: 1px solid #dcdcdd;
      }
      .myt-chat-header__tutor {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }
      .myt-chat-header__tutor h2 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #46494c;
      }
      .myt-online-status {
        margin: 0.15rem 0 0;
        font-size: 0.78rem;
        font-weight: 600;
        color: #11816f;
      }
      .myt-chat-context {
        margin: 1rem 1.75rem 0;
        padding: 0.75rem 1.1rem;
        border-radius: 12px;
        background: #e9e9ea;
        border: 1px solid #c5c3c6;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .myt-chat-context p {
        margin: 0;
        font-size: 0.82rem;
        color: #46494c;
      }
      .myt-link-teal {
        font-size: 0.82rem;
        font-weight: 700;
        color: #1985a1;
        text-decoration: none;
      }
      .myt-link-teal:hover {
        text-decoration: underline;
      }
      .myt-chat-messages {
        flex: 1;
        padding: 1.5rem 1.75rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow-y: auto;
      }
      .myt-bubble {
        max-width: 560px;
        padding: 0.9rem 1.1rem;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .myt-bubble--incoming {
        align-self: flex-start;
        background: #ffffff;
        border: 1px solid #dcdcdd;
        color: #46494c;
      }
      .myt-bubble--outgoing {
        align-self: flex-end;
        background: #1985a1;
        color: #f5f5f3;
      }
      .myt-bubble__text {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.45;
      }
      .myt-bubble__meta {
        font-size: 0.72rem;
        opacity: 0.85;
      }
      .myt-bubble--incoming .myt-bubble__meta {
        color: #6f7479;
      }
      .myt-bubble--outgoing .myt-bubble__meta {
        color: #ddecef;
        align-self: flex-end;
      }
      .myt-chat-composer {
        padding: 1rem 1.75rem;
        border-top: 1px solid #dcdcdd;
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }
      .myt-chat-composer input {
        flex: 1;
        background: #ffffff;
        border: 1px solid #c5c3c6;
        border-radius: 12px;
        padding: 0.7rem 1rem;
        font-size: 0.9rem;
        color: #46494c;
      }
    `,
  ],
})
export class MensajesPageComponent {
  readonly state = inject(MytStateService);

  readonly busqueda = signal('');
  readonly conversacionActivaId = signal(1);
  nuevoMensaje = '';

  readonly conversacionesFiltradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const lista = this.state.conversaciones();
    if (!q) {
      return lista;
    }
    return lista.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.ultimoMensaje.toLowerCase().includes(q) ||
        c.contextoDetalle.toLowerCase().includes(q),
    );
  });

  readonly conversacionActiva = computed(() => {
    const id = this.conversacionActivaId();
    const lista = this.state.conversaciones();
    return lista.find((c) => c.id === id) ?? lista[0];
  });

  seleccionarConversacion(id: number): void {
    this.conversacionActivaId.set(id);
  }

  enviarMensaje(): void {
    const activa = this.conversacionActiva();
    if (!activa || !this.nuevoMensaje.trim()) {
      return;
    }
    this.state.enviarMensaje(activa.id, this.nuevoMensaje);
    this.nuevoMensaje = '';
  }
}
