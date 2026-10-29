import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService, ReservaApi, mensajeHttp } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
@Component({
  selector: 'app-reserva-detalle-page',
  imports: [CommonModule, RouterLink],
  template: ` <main class="myt-page-shell">
    <a routerLink="/reservas">Volver a mis reservas</a>
    @if (cargando()) {
      <p role="status">Cargando reserva…</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button (click)="cargar()">Reintentar</button>
    }
    @if (reserva(); as r) {
      <section class="myt-surface-card">
        <h1>{{ creada ? '¡Solicitud enviada!' : 'Detalle de la reserva' }} #{{ r.id }}</h1>
        <p>Estado: {{ r.estado }}</p>
        <h2>{{ r.tema }}</h2>
        <p>
          {{ r.materia }} · {{ r.fecha }} · {{ r.horaInicio.slice(0, 5) }} ·
          {{ r.duracionMinutos }} minutos
        </p>
        <p>Tutor: {{ r.tutor }}</p>
        <p>Estudiante: {{ r.estudiante }}</p>
        @if (auth.sesion()?.rol !== 'ESTUDIANTE') {
          <p>Correo: {{ r.estudianteCorreo }}</p>
          <p>Teléfono: {{ r.estudianteTelefono || 'Sin registrar' }}</p>
        }
        <p>Modalidad: {{ r.modalidad }}</p>
        <p>Objetivo: {{ r.objetivo || 'Sin registrar' }}</p>
        <p>Total: {{ r.costoTotal | currency: 'COP' : 'symbol' : '1.0-0' }}</p>
        @if (r.motivoCancelacion) {
          <p>Motivo de cancelación: {{ r.motivoCancelacion }}</p>
        }
        @if (creada && r.estado === 'PENDIENTE') {
          <p>El tutor debe confirmar tu solicitud. Consulta su estado en Mis reservas.</p>
        }
        <div class="myt-toolbar-actions">
          <a routerLink="/calendario" class="myt-btn myt-btn--secondary">Ver calendario</a>
          @if (auth.sesion()?.rol !== 'ADMINISTRADOR') {
            <a
              routerLink="/mensajes"
              [queryParams]="{ reserva: r.id }"
              class="myt-btn myt-btn--primary"
              >Abrir chat</a
            >
          }
        </div>
      </section>
    }
  </main>`,
})
export class ReservaDetallePageComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly route = inject(ActivatedRoute);
  readonly destroyRef = inject(DestroyRef);
  readonly creada = this.route.snapshot.queryParamMap.get('creada') === '1';
  readonly reserva = signal<ReservaApi | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.reserva.set(null);
    this.api
      .reserva(Number(this.route.snapshot.paramMap.get('id')))
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => this.reserva.set(r),
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
}
