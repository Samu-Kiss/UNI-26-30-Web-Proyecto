import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, exhaustMap, finalize, forkJoin, of, take, takeWhile, timer } from 'rxjs';
import {
  ApiService,
  OrdenPagoApi,
  ReservaApi,
  mensajeHttp,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';

@Component({
  selector: 'app-pago-page',
  imports: [CommonModule, RouterLink, AvatarComponent, LucideIconComponent],
  styles: [
    `
      .payments-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.9fr);
        gap: 1.5rem;
        align-items: start;
      }
      @media (max-width: 960px) {
        .payments-grid {
          grid-template-columns: 1fr;
        }
      }
      .payments-stack {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .payment-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.15rem;
        border: 1px solid var(--myt-border, #e2e8f0);
        border-radius: 0.85rem;
        background: var(--myt-surface, #ffffff);
        cursor: pointer;
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }
      .payment-option.is-selected {
        border-color: var(--myt-primary, #1e293b);
        box-shadow: 0 0 0 2px rgba(30, 41, 59, 0.12);
      }
      .payment-option__meta {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .payment-option__meta h3 {
        margin: 0;
        font-size: 1rem;
      }
      .payment-option__meta p {
        margin: 0;
        font-size: 0.875rem;
        color: var(--myt-text-muted, #64748b);
      }
      .payment-summary-total {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 1rem 0;
        margin: 0.75rem 0;
        border-top: 1px solid var(--myt-border, #e2e8f0);
        border-bottom: 1px solid var(--myt-border, #e2e8f0);
      }
      .payment-summary-total strong {
        font-size: 1.35rem;
      }
      .orders-list {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .order-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.15rem;
        border: 1px solid var(--myt-border, #e2e8f0);
        border-radius: 0.85rem;
        background: var(--myt-surface, #ffffff);
        flex-wrap: wrap;
      }
      .order-item__info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .order-item__title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .order-item__ref {
        font-family: monospace;
        font-size: 0.82rem;
        color: var(--myt-text-muted, #64748b);
      }
      .order-item__actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.4rem;
      }
    `,
  ],
  template: `
    <main class="myt-page-shell">
      <header class="myt-page-header">
        <div>
          <h1>Pagos de tutorías con Wompi</h1>
          <p class="myt-subtitle">
            {{
              esEstudiante()
                ? 'Paga tus sesiones reservadas de forma segura con Wompi Sandbox y confirma tu tutoría.'
                : 'Consulta el estado de los pagos y transacciones procesadas con Wompi.'
            }}
          </p>
        </div>
        <a routerLink="/reservas" class="myt-btn myt-btn--secondary">
          <app-lucide-icon name="calendar" [size]="16" />Mis reservas
        </a>
      </header>

      @if (mensaje()) {
        <div
          class="myt-alert"
          [class.myt-alert--success]="estadoActual() === 'APPROVED'"
          [class.myt-alert--error]="
            estadoActual() === 'DECLINED' || estadoActual() === 'ERROR' || !habilitado()
          "
          role="status"
        >
          <span>{{ mensaje() }}</span>
          @if (reservaPagadaId(); as resId) {
            <a [routerLink]="['/reservas', resId]" class="myt-btn myt-btn--secondary myt-btn--sm">
              Ver tutoría #{{ resId }}
            </a>
          }
        </div>
      }

      <div class="payments-grid">
        <div class="payments-stack">
          @if (esEstudiante()) {
            <section class="myt-surface-card">
              <h2>Selecciona la tutoría a pagar</h2>
              @if (reservasPorPagar().length > 0) {
                <p class="myt-subtitle" style="margin-bottom: 1rem">
                  Al aprobarse el pago en Wompi, una reserva pendiente pasa automáticamente a
                  <strong>Confirmada</strong>.
                </p>
                <div class="payments-stack">
                  @for (r of reservasPorPagar(); track r.id) {
                    <div
                      class="payment-option"
                      [class.is-selected]="reservaSeleccionada()?.id === r.id"
                      (click)="seleccionarReserva(r)"
                    >
                      <div class="payment-option__meta">
                        <div class="order-item__title">
                          <span class="session-state" [attr.data-state]="r.estado">{{
                            r.estado.replace('_', ' ') | titlecase
                          }}</span>
                          <span class="order-item__ref">Reserva #{{ r.id }}</span>
                        </div>
                        <h3>{{ r.materia }} · {{ r.tema }}</h3>
                        <p>
                          Tutor: {{ r.tutor }} · {{ r.fecha }} ({{ r.horaInicio.slice(0, 5) }},
                          {{ r.duracionMinutos }} min)
                        </p>
                      </div>
                      <div class="order-item__actions">
                        <strong
                          >{{
                            r.costoTotal | currency: 'COP' : 'symbol-narrow' : '1.0-0'
                          }}
                          COP</strong
                        >
                        <button
                          type="button"
                          class="myt-btn myt-btn--sm"
                          [class.myt-btn--primary]="reservaSeleccionada()?.id === r.id"
                          [class.myt-btn--secondary]="reservaSeleccionada()?.id !== r.id"
                          (click)="seleccionarReserva(r); $event.stopPropagation()"
                        >
                          {{ reservaSeleccionada()?.id === r.id ? 'Seleccionada' : 'Elegir' }}
                        </button>
                      </div>
                    </div>
                  }
                  <div
                    class="payment-option"
                    [class.is-selected]="reservaSeleccionada() === null"
                    (click)="seleccionarReserva(null)"
                  >
                    <div class="payment-option__meta">
                      <div class="order-item__title">
                        <span class="session-state" data-state="PENDIENTE">Abono general</span>
                      </div>
                      <h3>Abono de tutoría académica MyT</h3>
                      <p>Pago de prueba estándar en Wompi Sandbox ($15.000 COP)</p>
                    </div>
                    <div class="order-item__actions">
                      <strong>$15.000 COP</strong>
                      <button
                        type="button"
                        class="myt-btn myt-btn--sm"
                        [class.myt-btn--primary]="reservaSeleccionada() === null"
                        [class.myt-btn--secondary]="reservaSeleccionada() !== null"
                        (click)="seleccionarReserva(null); $event.stopPropagation()"
                      >
                        {{ reservaSeleccionada() === null ? 'Seleccionado' : 'Elegir' }}
                      </button>
                    </div>
                  </div>
                </div>
              } @else {
                <p>
                  No tienes reservas pendientes de pago en este momento. Puedes realizar un abono de
                  tutoría académica ($15.000 COP) o
                  <a routerLink="/tutores">explorar tutores para agendar una nueva sesión</a>.
                </p>
              }
            </section>
          }

          <section class="myt-surface-card">
            <h2>Historial de órdenes Wompi</h2>
            @if (cargandoOrdenes()) {
              <p role="status">Cargando órdenes…</p>
            } @else if (ordenes().length === 0) {
              <p class="myt-subtitle">Aún no se han registrado órdenes de pago con Wompi.</p>
            } @else {
              <div class="orders-list">
                @for (o of ordenes(); track o.referencia) {
                  <article class="order-item">
                    <div class="order-item__info">
                      <div class="order-item__title">
                        <span
                          class="session-state"
                          [attr.data-state]="
                            o.estado === 'APPROVED'
                              ? 'CONFIRMADA'
                              : o.estado === 'PENDING'
                                ? 'PENDIENTE'
                                : 'RECHAZADA'
                          "
                        >
                          {{ etiquetaEstadoPago(o.estado) }}
                        </span>
                        <span class="order-item__ref">{{ o.referencia }}</span>
                        @if (o.wompiTransaccionId) {
                          <span class="order-item__ref">· TX: {{ o.wompiTransaccionId }}</span>
                        }
                      </div>
                      <strong>{{ o.concepto }}</strong>
                      <span class="myt-subtitle">
                        @if (o.reservaId) {
                          <a [routerLink]="['/reservas', o.reservaId]"
                            >Reserva #{{ o.reservaId }}</a
                          >
                          @if (o.tutor) {
                            · Tutor: {{ o.tutor }}
                          }
                          @if (o.estudiante && !esEstudiante()) {
                            · Estudiante: {{ o.estudiante }}
                          }
                        } @else {
                          Abono directo en plataforma
                        }
                      </span>
                    </div>
                    <div class="order-item__actions">
                      <strong
                        >{{ o.montoCop | currency: 'COP' : 'symbol-narrow' : '1.0-0' }} COP</strong
                      >
                      @if (o.estado === 'PENDING') {
                        <button
                          type="button"
                          class="myt-btn myt-btn--secondary myt-btn--sm"
                          [disabled]="consultando()"
                          (click)="seguirPago(o.referencia)"
                        >
                          Verificar estado
                        </button>
                      }
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        </div>

        <aside class="myt-surface-card">
          <h2>Resumen de pago Wompi</h2>
          @if (reservaSeleccionada(); as r) {
            <div style="display: flex; align-items: center; gap: 0.75rem; margin: 0.75rem 0">
              <app-avatar [name]="r.tutor" [initials]="r.tutor.charAt(0)" size="sm" />
              <div>
                <strong>{{ r.materia }}</strong
                ><br />
                <span class="myt-subtitle">Tutor: {{ r.tutor }} · Reserva #{{ r.id }}</span>
              </div>
            </div>
            <p class="myt-subtitle">{{ r.tema }}</p>
            <div class="payment-summary-total">
              <span>Total a pagar</span>
              <strong>{{ r.costoTotal | currency: 'COP' : 'symbol-narrow' : '1.0-0' }} COP</strong>
            </div>
          } @else {
            <p class="myt-subtitle">Abono de tutoría académica MyT (Wompi Sandbox)</p>
            <div class="payment-summary-total">
              <span>Total a pagar</span>
              <strong>$15.000 COP</strong>
            </div>
          }

          @if (checkout(); as pago) {
            <div class="payments-stack">
              <a
                class="myt-btn myt-btn--primary"
                style="width: 100%; justify-content: center"
                [href]="pago.url"
                target="_blank"
                rel="noopener"
                (click)="seguirPago(pago.referencia)"
              >
                <app-lucide-icon name="credit-card" [size]="16" />
                Abrir checkout de Wompi
              </a>
              <p class="myt-subtitle" style="margin: 0">
                Referencia: <code>{{ pago.referencia }}</code>. Completa el pago en la pestaña de
                Wompi y vuelve aquí para ver la confirmación automática.
              </p>
              @if (!consultando()) {
                <button
                  type="button"
                  class="myt-btn myt-btn--secondary"
                  style="width: 100%; justify-content: center"
                  (click)="nuevoPago()"
                >
                  Iniciar otro pago
                </button>
              }
            </div>
          } @else if (!referenciaInicial) {
            <button
              type="button"
              class="myt-btn myt-btn--primary"
              style="width: 100%; justify-content: center"
              [disabled]="!habilitado() || enviando() || !puedeIniciarCheckout()"
              (click)="pagar()"
            >
              <app-lucide-icon name="credit-card" [size]="16" />
              {{
                enviando()
                  ? 'Generando orden…'
                  : reservaSeleccionada()
                    ? 'Pagar tutoría con Wompi'
                    : 'Pagar con Wompi'
              }}
            </button>
          } @else {
            <a
              routerLink="/pago"
              class="myt-btn myt-btn--secondary"
              style="width: 100%; justify-content: center"
              (click)="nuevoPago()"
            >
              Volver a pagos
            </a>
          }

          <p class="myt-subtitle" style="margin-top: 1rem; font-size: 0.82rem">
            <app-lucide-icon name="shield-check" [size]="15" />
            Integración firmada con SHA-256 (<code>signature:integrity</code>) y validación de
            eventos Webhook en Wompi Sandbox.
          </p>
        </aside>
      </div>
    </main>
  `,
})
export class PagoPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly referenciaInicial = this.route.snapshot.queryParamMap.get('referencia');
  readonly transaccionInicial = this.route.snapshot.queryParamMap.get('id');
  readonly reservaParam = Number(this.route.snapshot.queryParamMap.get('reserva') || 0);

  readonly esEstudiante = computed(() => this.auth.sesion()?.rol === 'ESTUDIANTE');
  readonly puedeIniciarCheckout = computed(() => {
    const rol = this.auth.sesion()?.rol;
    return rol === 'ESTUDIANTE' || rol === 'ADMINISTRADOR';
  });

  readonly habilitado = signal(false);
  readonly enviando = signal(false);
  readonly checkout = signal<{
    url: string;
    referencia: string;
    reservaId?: number;
    montoEnCentavos?: number;
    concepto?: string;
  } | null>(null);
  readonly consultando = signal(false);
  readonly cargandoOrdenes = signal(true);
  readonly mensaje = signal('Cargando pasarela de pagos…');
  readonly estadoActual = signal<string>('');
  readonly reservaPagadaId = signal<number | null>(null);

  readonly reservas = signal<ReservaApi[]>([]);
  readonly ordenes = signal<OrdenPagoApi[]>([]);
  readonly reservaSeleccionada = signal<ReservaApi | null>(null);

  readonly reservasPorPagar = computed(() =>
    this.reservas().filter(
      (r) =>
        (r.estado === 'PENDIENTE' || r.estado === 'CONFIRMADA') && r.estadoPago !== 'APPROVED',
    ),
  );

  ngOnInit() {
    this.cargarDatosContexto();

    if (this.referenciaInicial) {
      this.consultar(this.referenciaInicial, this.transaccionInicial);
      return;
    }

    this.api
      .configuracionPagos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ habilitado }) => {
          this.habilitado.set(habilitado);
          this.mensaje.set(
            habilitado ? '' : 'Wompi Sandbox todavía está sin configurar en el backend.',
          );
        },
        error: (error) => this.mensaje.set(mensajeHttp(error)),
      });
  }

  cargarDatosContexto() {
    this.cargandoOrdenes.set(true);
    forkJoin({
      reservas: this.api.reservas().pipe(catchError(() => of([] as ReservaApi[]))),
      ordenes: this.api.ordenesPago().pipe(catchError(() => of([] as OrdenPagoApi[]))),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoOrdenes.set(false)),
      )
      .subscribe(({ reservas, ordenes }) => {
        this.reservas.set(reservas);
        this.ordenes.set(ordenes);
        const pendientes = reservas.filter(
          (r) =>
            (r.estado === 'PENDIENTE' || r.estado === 'CONFIRMADA') && r.estadoPago !== 'APPROVED',
        );
        if (this.reservaParam > 0) {
          const encontrada = pendientes.find((r) => r.id === this.reservaParam);
          if (encontrada) {
            this.reservaSeleccionada.set(encontrada);
            return;
          }
        }
        if (pendientes.length > 0 && !this.reservaSeleccionada()) {
          this.reservaSeleccionada.set(pendientes[0]);
        }
      });
  }

  seleccionarReserva(reserva: ReservaApi | null) {
    this.reservaSeleccionada.set(reserva);
    this.checkout.set(null);
  }

  pagar() {
    this.enviando.set(true);
    this.mensaje.set('');
    this.estadoActual.set('');
    const reservaId = this.reservaSeleccionada()?.id;
    this.api
      .checkoutPago(reservaId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: (pago) => {
          this.cargarDatosContexto();
          if (new URL(pago.url).searchParams.has('redirect-url')) {
            window.location.assign(pago.url);
          } else {
            this.checkout.set(pago);
          }
        },
        error: (error) => this.mensaje.set(mensajeHttp(error)),
      });
  }

  nuevoPago() {
    this.checkout.set(null);
    this.mensaje.set('');
    this.estadoActual.set('');
    this.reservaPagadaId.set(null);
  }

  seguirPago(referencia: string) {
    if (!this.consultando()) this.consultar(referencia, null);
  }

  etiquetaEstadoPago(estado: string): string {
    switch (estado) {
      case 'APPROVED':
        return 'Aprobado';
      case 'PENDING':
        return 'Pendiente';
      case 'DECLINED':
        return 'Rechazado';
      case 'VOIDED':
        return 'Anulado';
      case 'ERROR':
        return 'Error';
      default:
        return estado;
    }
  }

  private consultar(referencia: string, transaccionId: string | null) {
    this.consultando.set(true);
    this.mensaje.set('Estamos confirmando tu pago con Wompi…');
    timer(0, 2500)
      .pipe(
        exhaustMap(() => this.api.estadoOrdenPago(referencia, transaccionId)),
        take(25),
        takeWhile(({ estado }) => estado === 'PENDING', true),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.consultando.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.estadoActual.set(respuesta.estado);
          if (respuesta.reservaId) {
            this.reservaPagadaId.set(respuesta.reservaId);
          }
          if (respuesta.estado === 'APPROVED') {
            this.mensaje.set(
              respuesta.reservaId
                ? `¡Pago aprobado! La tutoría #${respuesta.reservaId} ha quedado pagada y confirmada.`
                : '¡Pago aprobado!',
            );
            this.cargarDatosContexto();
          } else if (respuesta.estado !== 'PENDING') {
            this.mensaje.set(`Pago sin completar (${this.etiquetaEstadoPago(respuesta.estado)}).`);
            this.cargarDatosContexto();
          }
        },
        error: (error) => this.mensaje.set(mensajeHttp(error)),
        complete: () => {
          if (this.mensaje() === 'Estamos confirmando tu pago con Wompi…') {
            this.mensaje.set(
              'El pago sigue pendiente. Recarga esta página o pulsa "Verificar estado" para consultar su avance.',
            );
          }
        },
      });
  }
}
