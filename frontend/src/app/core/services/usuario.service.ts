import { inject, Injectable } from '@angular/core';
import { RegistroUsuario } from '../models/usuario.model';
import { BackendFormService } from './backend-form.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly backend = inject(BackendFormService);

  guardar(usuario: RegistroUsuario, sesion: string): void {
    if (!sesion) throw new Error('Inicia sesión como administrador para registrar usuarios.');
    const {
      nombre,
      apellido,
      correo,
      contrasena,
      telefono,
      rol,
      codigoEstudiantil,
      universidad,
      programaAcademico,
      semestre,
      biografia,
      materias,
      tarifaPorHora,
    } = usuario;
    this.backend.enviar('/usuarios/registrar', {
      sesion,
      nombre,
      apellido,
      correo,
      contrasena,
      telefono,
      rol,
      codigoEstudiantil,
      universidad,
      programaAcademico,
      semestre,
      biografia,
      materias,
      tarifaPorHora,
    });
  }
}
