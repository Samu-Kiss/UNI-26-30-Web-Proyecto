import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { exhaustMap, finalize, take, takeWhile, timer } from 'rxjs';
import { mensajeHttp } from '../../core/services/api.service';

@Component({
  imports: [RouterLink],
  template: `
    <section class="myt-page">
      <h1>Laboratorio Wompi</h1>
      <p>Pago de prueba por $15.000 COP.</p>
      <p role="status">{{ mensaje() }}</p>
      @if (checkout(); as pago) {
        <a
          class="myt-btn myt-btn--primary"
          [href]="pago.url"
          target="_blank"
          rel="noopener"
          (click)="seguirPago(pago.referencia)"
        >
          Abrir checkout de Wompi
        </a>
        <p>Completa el pago en la otra pestaña y vuelve aquí para ver el resultado.</p>
        @if (!consultando()) {
          <button type="button" class="myt-btn" (click)="nuevoPago()">Iniciar otro pago</button>
        }
      } @else if (!referencia) {
        <button
          type="button"
          class="myt-btn myt-btn--primary"
          [disabled]="!habilitado() || enviando()"
          (click)="pagar()"
        >
          Pagar con Wompi
        </button>
      } @else {
        <a routerLink="/pago">Volver al laboratorio</a>
      }
    </section>
  `,
})
export class PagoPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly referencia = inject(ActivatedRoute).snapshot.queryParamMap.get('referencia');
  readonly habilitado = signal(false);
  readonly enviando = signal(false);
  readonly checkout = signal<{ url: string; referencia: string } | null>(null);
  readonly consultando = signal(false);
  readonly mensaje = signal('Cargando el laboratorio…');

  ngOnInit() {
    if (this.referencia) {
      this.consultar(this.referencia);
      return;
    }
    this.http
      .get<{ habilitado: boolean }>('/api/pagos/configuracion')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ habilitado }) => {
          this.habilitado.set(habilitado);
          this.mensaje.set(habilitado ? '' : 'Wompi Sandbox todavía está sin configurar.');
        },
        error: (error) => this.mensaje.set(mensajeHttp(error)),
      });
  }

  pagar() {
    this.enviando.set(true);
    this.mensaje.set('');
    this.http
      .post<{ url: string; referencia: string }>('/api/pagos/checkout', {})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: (pago) => {
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
  }

  seguirPago(referencia: string) {
    if (!this.consultando()) this.consultar(referencia);
  }

  private consultar(referencia: string) {
    this.consultando.set(true);
    this.mensaje.set('Estamos confirmando tu pago…');
    timer(0, 2500)
      .pipe(
        exhaustMap(() =>
          this.http.get<{ estado: string }>(
            `/api/pagos/orden/${encodeURIComponent(referencia)}`,
          ),
        ),
        take(25),
        takeWhile(({ estado }) => estado === 'PENDING', true),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.consultando.set(false)),
      )
      .subscribe({
        next: ({ estado }) => {
          if (estado === 'APPROVED') this.mensaje.set('¡Pago aprobado!');
          else if (estado !== 'PENDING') this.mensaje.set(`Pago sin completar (${estado}).`);
        },
        error: (error) => this.mensaje.set(mensajeHttp(error)),
        complete: () => {
          if (this.mensaje() === 'Estamos confirmando tu pago…') {
            this.mensaje.set('El pago sigue pendiente. Recarga esta página para consultar su estado.');
          }
        },
      });
  }
}
