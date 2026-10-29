import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, Subject, switchMap, timer } from 'rxjs';
import { ApiService, MensajeApi, ReservaApi, mensajeHttp } from '../../core/services/api.service';
@Component({
  selector: 'app-mensajes-page',
  imports: [CommonModule, FormsModule, RouterLink],
  template: ` <main class="myt-page-shell">
    <h1>Mensajes</h1>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button (click)="cargar()">Reintentar</button>
    }
    @if (cargando()) {
      <p role="status">Cargando conversaciones…</p>
    }
    <label class="form-field"
      >Tutoría<select [ngModel]="seleccionada()" (ngModelChange)="seleccionar($event)">
        <option [ngValue]="0">Selecciona una reserva</option>
        @for (r of reservas(); track r.id) {
          <option [ngValue]="r.id">
            #{{ r.id }} · {{ r.tema }} · {{ r.tutor }} / {{ r.estudiante }}
          </option>
        }
      </select></label
    >
    @if (!cargando() && !reservas().length && !error()) {
      <p>No tienes reservas con conversaciones disponibles.</p>
    }
    @if (seleccionada()) {
      <a [routerLink]="['/reservas', seleccionada()]">Ver detalle de la reserva</a>
      <section class="myt-surface-card" aria-live="polite">
        @if (cargandoMensajes()) {
          <p role="status">Cargando mensajes…</p>
        } @else {
          @for (m of mensajes(); track m.id) {
            <article>
              <strong>{{ m.autor }}</strong>
              <p>{{ m.contenido }}</p>
              <small>{{ m.fecha | date: 'short' }}</small>
            </article>
          } @empty {
            <p>No hay mensajes en esta conversación.</p>
          }
        }
      </section>
      <form #form="ngForm" (ngSubmit)="form.valid && enviar()">
        <label class="form-field"
          >Mensaje<textarea
            name="texto"
            [(ngModel)]="texto"
            required
            maxlength="4000"
            [disabled]="enviando()"
          ></textarea></label
        ><button
          class="myt-btn myt-btn--primary"
          [disabled]="form.invalid || !texto.trim() || enviando()"
        >
          Enviar mensaje
        </button>
      </form>
    }
  </main>`,
})
export class MensajesPageComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly route = inject(ActivatedRoute);
  readonly destroyRef = inject(DestroyRef);
  readonly reservas = signal<ReservaApi[]>([]);
  readonly mensajes = signal<MensajeApi[]>([]);
  readonly seleccionada = signal(0);
  readonly error = signal('');
  readonly cargando = signal(true);
  readonly cargandoMensajes = signal(false);
  readonly enviando = signal(false);
  private readonly refrescar = new Subject<number>();
  texto = '';
  ngOnInit() {
    this.refrescar
      .pipe(
        switchMap((id) => {
          this.mensajes.set([]);
          if (!id) return EMPTY;
          this.cargandoMensajes.set(true);
          return timer(0, 10000).pipe(
            switchMap(() =>
              this.api.mensajes(id).pipe(
                catchError((e) => {
                  this.error.set(mensajeHttp(e));
                  this.cargandoMensajes.set(false);
                  return EMPTY;
                }),
              ),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((m) => {
        this.mensajes.set(m);
        this.cargandoMensajes.set(false);
      });
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.api
      .reservas()
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => {
          this.reservas.set(r);
          const id =
            Number(this.route.snapshot.queryParamMap.get('reserva')) || this.seleccionada();
          if (r.some((x) => x.id === id)) this.seleccionar(id);
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
  seleccionar(id: number) {
    this.seleccionada.set(id);
    this.error.set('');
    this.refrescar.next(id);
  }
  enviar() {
    if (this.enviando() || !this.texto.trim()) return;
    this.enviando.set(true);
    this.api
      .enviarMensaje(this.seleccionada(), this.texto.trim())
      .pipe(
        finalize(() => this.enviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (m) => {
          this.mensajes.update((lista) => [...lista, m]);
          this.texto = '';
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
}
