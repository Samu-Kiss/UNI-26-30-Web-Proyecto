import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Subject, tap } from 'rxjs';
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
  modalidad?: string;
  objetivo?: string;
  motivoCancelacion?: string;
  estudianteCorreo?: string;
  estudianteTelefono?: string;
}
export interface EstudianteApi {
  id: number;
  usuarioId: number;
  nombreCompleto: string;
  correo: string;
  codigoEstudiantil: string;
  universidad: string;
  programaAcademico: string;
  semestre: number;
  activo: boolean;
}
export interface ReservaAlta {
  tutorId: number;
  materiaId: number;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
  tema: string;
  objetivo?: string;
  modalidad: 'VIRTUAL' | 'PRESENCIAL';
}
export function mensajeHttp(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No fue posible completar la operación.';
  if (error.status === 0 || error.status >= 500)
    return 'No hay conexión con el servidor. Conservamos tus datos; reintenta.';
  if (error.status === 401) return error.error?.mensaje || 'Tu sesión expiró. Vuelve a ingresar.';
  if (error.status === 403)
    return error.error?.mensaje || 'Tu perfil no tiene permiso para esta acción.';
  if (error.status === 409)
    return error.error?.mensaje || 'Conflicto: el registro ya existe o cambió. Revisa y reintenta.';
  return error.error?.mensaje || 'Revisa los datos ingresados y el horario disponible.';
}
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly cambios = new Subject<void>();
  agenda(id: number) {
    return this.http.get<AgendaApi>(`/api/tutores/${id}/agenda`);
  }
  guardarAgenda(id: number, agenda: AgendaApi) {
    return this.http
      .put<AgendaApi>(`/api/tutores/${id}/agenda`, agenda)
      .pipe(tap(() => this.cambios.next()));
  }
  horas(id: number, fecha: string, duracion: number) {
    return this.http.get<string[]>(`/api/tutores/${id}/agenda/horas`, {
      params: { fecha, duracion },
    });
  }
  resenas(tutorId?: number) {
    return this.http.get<ResenaApi[]>('/api/resenas', { params: tutorId ? { tutorId } : {} });
  }
  crearResena(datos: { reservaId: number; calificacion: number; comentario: string }) {
    return this.http.post<ResenaApi>('/api/resenas', datos).pipe(tap(() => this.cambios.next()));
  }
  mensajes(reservaId: number) {
    return this.http.get<MensajeApi[]>(`/api/chat/${reservaId}`);
  }
  enviarMensaje(reservaId: number, contenido: string) {
    return this.http.post<MensajeApi>(`/api/chat/${reservaId}`, { contenido });
  }

  private readonly tutoresCache = new Map<number, TutorApi>();

  tutorEnCache(id: number): TutorApi | undefined {
    return this.tutoresCache.get(id);
  }

  tutores(page = 0, materiaId = '', tarifaMax = '', q = '', orden = 'calificacion') {
    let params = new HttpParams().set('page', page).set('size', 6);
    if (q) params = params.set('q', q);
    if (orden === 'precio') params = params.set('orden', orden);
    if (materiaId) params = params.set('materiaId', materiaId);
    if (tarifaMax) params = params.set('tarifaMax', tarifaMax);
    return this.http.get<Pagina<TutorApi>>('/api/tutores', { params }).pipe(
      tap((p) => {
        for (const t of p.content ?? []) {
          this.tutoresCache.set(t.id, t);
        }
      }),
    );
  }
  tutor(id: number) {
    return this.http
      .get<TutorApi>(`/api/tutores/${id}`)
      .pipe(tap((t) => this.tutoresCache.set(t.id, t)));
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
  reserva(id: number) {
    return this.http.get<ReservaApi>(`/api/reservas/${id}`);
  }
  reservas(estado = '') {
    return this.http.get<ReservaApi[]>('/api/reservas', { params: estado ? { estado } : {} });
  }
  crearReserva(datos: ReservaAlta) {
    return this.http.post<ReservaApi>('/api/reservas', datos).pipe(tap(() => this.cambios.next()));
  }
  estadoReserva(id: number, estado: EstadoReserva, motivo: string) {
    return this.http
      .put<ReservaApi>(`/api/reservas/${id}/estado`, { estado, motivo })
      .pipe(tap(() => this.cambios.next()));
  }
  cancelarReserva(id: number, motivo: string) {
    return this.http
      .delete<void>(`/api/reservas/${id}`, { params: { motivo } })
      .pipe(tap(() => this.cambios.next()));
  }
  estudiantes() {
    return this.http.get<EstudianteApi[]>('/api/estudiantes');
  }
  estudiante(id: number) {
    return this.http.get<EstudianteApi>(`/api/estudiantes/${id}`);
  }
}

export interface AgendaApi {
  horarios: { diaSemana: string; horaInicio: string; horaFin: string }[];
  bloqueos: { fecha: string; horaInicio: string; horaFin: string; motivo: string }[];
}
export interface ResenaApi {
  id: number;
  reservaId: number;
  tutorId: number;
  tutor: string;
  estudiante: string;
  calificacion: number;
  comentario: string;
  fecha: string;
}
export interface MensajeApi {
  id: number;
  autor: string;
  contenido: string;
  fecha: string;
}
