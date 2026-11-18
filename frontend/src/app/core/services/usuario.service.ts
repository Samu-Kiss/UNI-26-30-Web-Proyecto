import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RegistroUsuario, Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/usuarios';

  private readonly usuarioSeleccionadoFuente = new BehaviorSubject<Usuario | null>(null);
  readonly usuarioSeleccionado$ = this.usuarioSeleccionadoFuente.asObservable();

  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.url);
  }

  consultarPorId(id: number): Observable<Usuario | null> {
    return this.http.get<Usuario>(`${this.url}/${id}`);
  }

  seleccionarUsuario(usuario: Usuario | null): void {
    this.usuarioSeleccionadoFuente.next(usuario);
  }

  guardar(usuario: RegistroUsuario): Observable<void> {
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
    return this.http.post<void>(this.url, {
      nombre,
      apellido,
      correo,
      contrasena,
      telefono,
      rol,
      codigoEstudiantil,
      universidad,
      programaAcademico,
      semestre: semestre ? Number(semestre) : null,
      biografia,
      materias,
      tarifaPorHora: tarifaPorHora ? Number(tarifaPorHora) : null,
    });
  }

  actualizar(id: number, datos: { nombre: string; apellido: string; correo: string; telefono?: string }): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}`, datos);
  }

  alternarEstado(id: number, activo: boolean): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}/activo`, { activo });
  }

  agregarPerfil(id: number, datos: { rol: string; codigoEstudiantil?: string; universidad?: string; programaAcademico?: string; semestre?: number | null; biografia?: string; materias?: string; tarifaPorHora?: number | null }): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/perfiles`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
