import { Injectable, signal } from '@angular/core';

export interface ResenaItem {
  id: number;
  tutorId: number;
  tutorNombre: string;
  estudiante: string;
  calificacion: number;
  comentario: string;
  etiquetas: string[];
  fecha: string;
  tema: string;
  publica: boolean;
}

export interface DiaDisponibilidad {
  etiquetaDia: string;
  numeroDia: string;
  fechaIso: string;
  horarios: string[];
}

export interface MensajeChat {
  id: number;
  autor: 'TUTOR' | 'ESTUDIANTE';
  texto: string;
  hora: string;
}

export interface ConversacionChat {
  id: number;
  tutorId: number;
  nombre: string;
  inicial: string;
  materias: string;
  enLinea: boolean;
  tiempoRespuesta: string;
  ultimoMensaje: string;
  ultimaHora: string;
  contextoEstado: string;
  contextoDetalle: string;
  reservaId: number;
  mensajes: MensajeChat[];
}

export interface EventoCalendario {
  id: number;
  codigo: string;
  diaMes: number;
  mesTexto: string;
  fechaCorta: string;
  fechaLarga: string;
  titulo: string;
  materia: string;
  tema: string;
  tutorNombre: string;
  tutorSubtitulo: string;
  tutorCalificacion: string;
  horaInicio: string;
  rangoHora: string;
  duracionMinutos: number;
  modalidad: 'En línea' | 'Presencial';
  enlace: string;
  valorCop: number;
  mensajeInicial: string;
  estado: 'CONFIRMADA' | 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
}

export interface EstudianteRegistro {
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

@Injectable({ providedIn: 'root' })
export class MytStateService {
  readonly disponibilidadPorDefecto: DiaDisponibilidad[] = [];

  readonly resenas = signal<ResenaItem[]>([]);

  readonly conversaciones = signal<ConversacionChat[]>([]);

  readonly eventosCalendario = signal<EventoCalendario[]>([]);

  readonly estudiantesBase = signal<EstudianteRegistro[]>([]);
}
