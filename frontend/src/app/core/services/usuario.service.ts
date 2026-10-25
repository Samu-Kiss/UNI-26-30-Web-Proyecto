import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { RegistroUsuario, Usuario } from '../models/usuario.model';
import { BackendFormService } from './backend-form.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly backend = inject(BackendFormService);
  private readonly http = inject(HttpClient);
  private readonly url = '/api/usuarios';

  private readonly usuarioSeleccionadoFuente = new BehaviorSubject<Usuario | null>(null);
  readonly usuarioSeleccionado$ = this.usuarioSeleccionadoFuente.asObservable();

  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.url);
  }

  consultarPorId(id: number): Observable<Usuario | null> {
    return this.obtenerUsuarios().pipe(
      map((lista) => lista.find((usuario) => usuario.id === id) ?? null),
    );
  }

  seleccionarUsuario(usuario: Usuario | null): void {
    this.usuarioSeleccionadoFuente.next(usuario);
  }

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
