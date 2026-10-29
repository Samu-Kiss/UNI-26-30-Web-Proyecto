import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, Subject, switchMap, timer } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';
import { ApiService, MensajeApi, ReservaApi, mensajeHttp } from '../../core/services/api.service';
@Component({
  selector: 'app-mensajes-page',
  imports: [CommonModule, FormsModule, RouterLink, AvatarComponent, LucideIconComponent],
  templateUrl: './mensajes-page.html',
  styleUrl: './mensajes-page.css',
})
export class MensajesPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly busqueda = signal('');
  readonly conversaciones = computed(() =>
    this.reservas().filter((r) =>
      (this.interlocutor(r) + ' ' + r.materia + ' ' + r.tema)
        .toLocaleLowerCase()
        .includes(this.busqueda().trim().toLocaleLowerCase()),
    ),
  );
  readonly reservaSeleccionada = computed(() =>
    this.reservas().find((r) => r.id === this.seleccionada()),
  );
  interlocutor(r: ReservaApi) {
    return this.auth.sesion()?.rol === 'TUTOR' ? r.estudiante : r.tutor;
  }
  esPropio(m: MensajeApi) {
    const nombre = this.auth.sesion()?.nombreUsuario?.trim().toLocaleLowerCase() || '';
    return (
      !!nombre &&
      (m.autor.trim().toLocaleLowerCase() === nombre ||
        m.autor.trim().toLocaleLowerCase() === nombre.split(' ')[0])
    );
  }
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
          if (r.some((x) => x.id === id)) {
            if (id === this.seleccionada()) this.refrescar.next(id);
            else this.seleccionar(id);
          }
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
  seleccionar(id: number) {
    if (id === this.seleccionada()) return;
    this.texto = '';
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
