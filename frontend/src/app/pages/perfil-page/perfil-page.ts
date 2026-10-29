import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { mensajeHttp } from '../../core/services/api.service';
import { Usuario } from '../../core/models/usuario.model';
import { AgendaEditorComponent } from '../../shared/components/organisms/agenda-editor/agenda-editor';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';
import { AvatarComponent } from '../../shared/components/atoms/avatar/avatar';

@Component({
  selector: 'app-perfil-page',
  imports: [FormsModule, AgendaEditorComponent, LucideIconComponent, AvatarComponent],
  templateUrl: './perfil-page.html',
  styleUrl: './perfil-page.css',
})
export class PerfilPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  readonly route = inject(ActivatedRoute);
  readonly destroyRef = inject(DestroyRef);
  readonly esSetup = computed(() => this.route.snapshot.queryParamMap.get('setup') === '1');
  readonly usuario = signal<Usuario | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.http
      .get<Usuario>('/api/perfil')
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (u) => this.usuario.set(u),
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
  guardar() {
    const u = this.usuario();
    if (!u || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.http
      .put<Usuario>('/api/perfil', u)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => {
          this.usuario.set(r);
          this.mensaje.set('Perfil actualizado.');
          this.auth.sesion.update((s) =>
            s ? { ...s, nombreUsuario: r.nombre + ' ' + r.apellido } : s,
          );
        },
        error: (e) => this.error.set(mensajeHttp(e)),
      });
  }
}
