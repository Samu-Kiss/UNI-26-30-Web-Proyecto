import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
export interface Materia {
  id: number;
  nombre: string;
}
export interface TutorApi {
  id: number;
  usuarioId: number;
  nombre: string;
  biografia: string;
  tarifaPorHora: number;
  disponible: boolean;
  materias: Materia[];
  calificacion: number | null;
}
export interface TutorEdicion {
  biografia: string;
  tarifaPorHora: number;
  disponible: boolean;
}
export interface TutorAlta {
  usuarioId: number;
  biografia: string;
  tarifaPorHora: number;
  materiaIds: number[];
}
export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}
export type EstadoReserva =
  'PENDIENTE' | 'CONFIRMADA' | 'EN_CURSO' | 'COMPLETADA' | 'RECHAZADA' | 'CANCELADA';
export interface ReservaApi {
  id: number;
  tutorId: number;
  estudianteId: number;
  tutor: string;
  estudiante: string;
  materia: string;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
  tema: string;
  estado: EstadoReserva;
  costoTotal: number;
}
export interface ReservaAlta {
  tutorId: number;
  materiaId: number;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
  tema: string;
  modalidad: 'VIRTUAL' | 'PRESENCIAL';
}
export function mensajeHttp(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No fue posible completar la operación.';
  if (error.status === 0 || error.status >= 500)
    return 'No hay conexión con el servidor. Conservamos tus datos; reintenta.';
  if (error.status === 401) return error.error?.mensaje || 'Tu sesión expiró. Vuelve a ingresar.';
  if (error.status === 403) return 'Tu perfil no tiene permiso para esta acción.';
  if (error.status === 409)
    return error.error?.mensaje || 'Conflicto: el registro ya existe o cambió. Revisa y reintenta.';
  return error.error?.mensaje || 'Revisa los datos ingresados y el horario disponible.';
}
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  tutores(page = 0, materiaId = '', tarifaMax = '') {
    let params = new HttpParams().set('page', page).set('size', 5);
    if (materiaId) params = params.set('materiaId', materiaId);
    if (tarifaMax) params = params.set('tarifaMax', tarifaMax);
    return this.http.get<Pagina<TutorApi>>('/api/tutores', { params });
  }
  tutor(id: number) {
    return this.http.get<TutorApi>(`/api/tutores/${id}`);
  }
  materias() {
    return this.http.get<Materia[]>('/api/tutores/materias');
  }
  crearTutor(datos: TutorAlta) {
    return this.http.post<TutorApi>('/api/tutores', datos);
  }
  editarTutor(id: number, datos: TutorEdicion) {
    return this.http.put<TutorApi>(`/api/tutores/${id}`, datos);
  }
  desactivarTutor(id: number) {
    return this.http.delete<void>(`/api/tutores/${id}`);
  }
  reservas(estado = '') {
    return this.http.get<ReservaApi[]>('/api/reservas', { params: estado ? { estado } : {} });
  }
  crearReserva(datos: ReservaAlta) {
    return this.http.post<ReservaApi>('/api/reservas', datos);
  }
  estadoReserva(id: number, estado: EstadoReserva, motivo: string) {
    return this.http.put<ReservaApi>(`/api/reservas/${id}/estado`, { estado, motivo });
  }
  cancelarReserva(id: number) {
    return this.http.delete<void>(`/api/reservas/${id}`);
  }
}
