import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RegistroUsuario } from '../../core/models/usuario.model';
import { UsuarioService } from '../../core/services/usuario.service';
import { UsuarioFormComponent } from '../../shared/components/organisms/usuario-form/usuario-form';
import { BrandMarkComponent } from '../../shared/components/atoms/brand-mark/brand-mark';

@Component({
  selector: 'app-usuarios-page',
  imports: [UsuarioFormComponent, BrandMarkComponent, RouterLink],
  template: `
    <main class="app-container laboratorio-page">
      <section class="card card__body">
        <app-brand-mark />
        <h1>Nuevo usuario</h1>
        <p>Registra una cuenta de estudiante o tutor.</p>
        @if (!sesion) {
          <p role="alert">Inicia sesión como administrador y abre esta página con tu sesión.</p>
          <a routerLink="/login">Iniciar sesión</a>
        }
        <app-usuario-form [habilitado]="!!sesion" (usuarioGuardado)="guardarUsuario($event)" />
      </section>
    </main>
  `,
})
export class UsuariosPageComponent {
  private readonly usuarioService = inject(UsuarioService);
  readonly sesion = inject(ActivatedRoute).snapshot.queryParamMap.get('sesion') ?? '';

  guardarUsuario(usuario: RegistroUsuario): void {
    this.usuarioService.guardar(usuario, this.sesion);
  }
}
