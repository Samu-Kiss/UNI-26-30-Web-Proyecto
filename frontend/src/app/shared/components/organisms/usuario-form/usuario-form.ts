import { Component, input, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RegistroUsuario } from '../../../../core/models/usuario.model';

@Component({
  selector: 'app-usuario-form',
  imports: [FormsModule],
  templateUrl: './usuario-form.html',
})
export class UsuarioFormComponent {
  readonly habilitado = input(true);
  readonly usuarioGuardado = output<RegistroUsuario>();
  nombre = '';
  apellido = '';
  correo = '';
  contrasena = '';
  telefono = '';
  rol: 'ESTUDIANTE' | 'TUTOR' = 'ESTUDIANTE';
  codigoEstudiantil = '';
  universidad = '';
  programaAcademico = '';
  semestre = '';
  biografia = '';
  materias = '';
  tarifaPorHora = '';

  guardar(form: NgForm): void {
    if (!this.habilitado() || form.invalid || !this.nombre.trim() || !this.apellido.trim()) return;
    this.usuarioGuardado.emit({
      nombre: this.nombre.trim(),
      apellido: this.apellido.trim(),
      correo: this.correo.trim(),
      contrasena: this.contrasena,
      telefono: this.telefono.trim(),
      activo: true,
      roles: [this.rol],
      rol: this.rol,
      codigoEstudiantil: this.codigoEstudiantil.trim(),
      universidad: this.universidad.trim(),
      programaAcademico: this.programaAcademico.trim(),
      semestre: String(this.semestre),
      biografia: this.biografia.trim(),
      materias: this.materias.trim(),
      tarifaPorHora: String(this.tarifaPorHora),
    });
    this.contrasena = '';
  }
}

