import { inject, Injectable } from '@angular/core';
import { Credenciales } from '../models/usuario.model';
import { BackendFormService } from './backend-form.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly backend = inject(BackendFormService);

  iniciarSesion(credenciales: Credenciales): void {
    this.backend.enviar('/login', { ...credenciales });
  }
}
