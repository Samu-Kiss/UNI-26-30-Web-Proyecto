import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService, ReservaApi, mensajeHttp } from '../../core/services/api.service';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';
import { AuthService } from '../../core/services/auth.service';
@Component({
  selector: 'app-reserva-detalle-page',
  imports: [CommonModule, RouterLink, AvatarComponent, LucideIconComponent],
  templateUrl: './reserva-detalle-page.html',
  styleUrl: './reserva-detalle-page.css',
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
