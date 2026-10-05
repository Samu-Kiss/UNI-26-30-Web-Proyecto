import { Component, inject } from '@angular/core';
import { Credenciales } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { LoginFormComponent } from '../../shared/components/organisms/login-form/login-form';
import { BrandMarkComponent } from '../../shared/components/atoms/brand-mark/brand-mark';

@Component({
  selector: 'app-login-page',
  imports: [LoginFormComponent, BrandMarkComponent],
  template: `
    <main class="app-container laboratorio-page">
      <section class="card card__body">
        <app-brand-mark />
        <h1>Ingreso a MyT</h1>
        <p>Ingresa con el correo y la contraseña de tu cuenta.</p>
        <app-login-form [titulo]="'Iniciar sesión'" (loginEnviado)="procesarLogin($event)" />
      </section>
    </main>
  `,
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);

  procesarLogin(credenciales: Credenciales): void {
    this.authService.iniciarSesion(credenciales);
  }
}
