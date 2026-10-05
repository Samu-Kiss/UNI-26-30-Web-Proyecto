import { Component, input, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Credenciales } from '../../../../core/models/usuario.model';

@Component({
  selector: 'app-login-form',
  imports: [FormsModule],
  template: `
    <form #form="ngForm" (ngSubmit)="enviarLogin(form)" class="laboratorio-form">
      <h2>{{ titulo() }}</h2>
      <label class="form-field"
        >Correo
        <input
          class="text-input"
          type="email"
          name="correo"
          [(ngModel)]="correo"
          required
          email
          autocomplete="username"
        />
      </label>
      <label class="form-field"
        >Contraseña
        <input
          class="text-input"
          type="password"
          name="contrasena"
          [(ngModel)]="contrasena"
          required
          autocomplete="current-password"
        />
      </label>
      @if (form.submitted && form.invalid) {
        <p class="form-error" role="alert">Ingresa un correo válido y tu contraseña.</p>
      }
      <button class="btn btn--primary btn--lg" type="submit">Ingresar</button>
    </form>
  `,
})
export class LoginFormComponent {
  readonly titulo = input('Iniciar sesión');
  readonly loginEnviado = output<Credenciales>();
  correo = '';
  contrasena = '';

  enviarLogin(form: NgForm): void {
    if (form.invalid || !this.correo.trim()) return;
    this.loginEnviado.emit({ correo: this.correo.trim(), contrasena: this.contrasena });
    this.contrasena = '';
  }
}
