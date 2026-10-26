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
  readonly disponibilidadPorDefecto: DiaDisponibilidad[] = [
    {
      etiquetaDia: 'JUE',
      numeroDia: '3',
      fechaIso: '2026-09-03',
      horarios: ['8:00 a. m.', '10:00 a. m.', '2:00 p. m.', '4:00 p. m.'],
    },
    {
      etiquetaDia: 'VIE',
      numeroDia: '4',
      fechaIso: '2026-09-04',
      horarios: ['9:00 a. m.', '11:00 a. m.', '3:00 p. m.'],
    },
    {
      etiquetaDia: 'SÁB',
      numeroDia: '5',
      fechaIso: '2026-09-05',
      horarios: ['8:00 a. m.', '10:00 a. m.', '12:00 p. m.'],
    },
    {
      etiquetaDia: 'LUN',
      numeroDia: '7',
      fechaIso: '2026-09-07',
      horarios: ['8:00 a. m.', '2:00 p. m.', '4:00 p. m.', '6:00 p. m.'],
    },
  ];

  readonly resenas = signal<ResenaItem[]>([
    {
      id: 1,
      tutorId: 1,
      tutorNombre: 'Laura Mendoza',
      estudiante: 'María G.',
      calificacion: 5,
      comentario: 'Explica con mucha paciencia y usa ejemplos que realmente ayudan.',
      etiquetas: ['Explica con claridad', 'Es puntual', 'Buena comunicación'],
      fecha: '8 sep 2026',
      tema: 'Derivadas e integrales',
      publica: true,
    },
    {
      id: 2,
      tutorId: 1,
      tutorNombre: 'Laura Mendoza',
      estudiante: 'Juan P.',
      calificacion: 5,
      comentario: 'La clase fue puntual, clara y muy bien preparada.',
      etiquetas: ['Es puntual', 'Domina el tema'],
      fecha: '4 sep 2026',
      tema: 'Cálculo integral',
      publica: true,
    },
    {
      id: 3,
      tutorId: 2,
      tutorNombre: 'Andrés Torres',
      estudiante: 'Camila S.',
      calificacion: 5,
      comentario: 'Me ayudó a entender consultas JPQL y modelado relacional en una sola sesión.',
      etiquetas: ['Domina el tema', 'Material útil'],
      fecha: '2 sep 2026',
      tema: 'Bases de datos y SQL',
      publica: true,
    },
  ]);

  readonly conversaciones = signal<ConversacionChat[]>([
    {
      id: 1,
      tutorId: 1,
      nombre: 'Laura Mendoza',
      inicial: 'L',
      materias: 'Cálculo y Física',
      enLinea: true,
      tiempoRespuesta: 'responde en menos de 2 h',
      ultimoMensaje: 'Claro, podemos cambiar la hora.',
      ultimaHora: 'Ahora',
      contextoEstado: 'Tutoría pendiente',
      contextoDetalle: 'Derivadas e integrales · 8 sep · 4:00 p. m.',
      reservaId: 1,
      mensajes: [
        {
          id: 1,
          autor: 'TUTOR',
          texto:
            'Hola, Samuel. Vi tu solicitud sobre integrales. ¿Tienes algún ejercicio específico que quieras revisar?',
          hora: '3:12 p. m.',
        },
        {
          id: 2,
          autor: 'ESTUDIANTE',
          texto:
            'Sí, especialmente sustitución trigonométrica. También quisiera repasar un ejercicio del taller.',
          hora: '3:16 p. m.',
        },
        {
          id: 3,
          autor: 'TUTOR',
          texto: 'Perfecto. Para prepararlo bien, ¿podríamos mover la sesión a las 6:00 p. m.?',
          hora: '3:18 p. m.',
        },
        {
          id: 4,
          autor: 'ESTUDIANTE',
          texto: 'Sí, a las 6:00 p. m. me funciona.',
          hora: '3:20 p. m.',
        },
      ],
    },
    {
      id: 2,
      tutorId: 3,
      nombre: 'Camila Rojas',
      inicial: 'C',
      materias: 'Inglés académico',
      enLinea: true,
      tiempoRespuesta: 'responde en menos de 1 h',
      ultimoMensaje: 'Te envío el material de lectura.',
      ultimaHora: 'Ayer',
      contextoEstado: 'Tutoría confirmada',
      contextoDetalle: 'Ensayo argumentativo · 15 sep · 6:00 p. m.',
      reservaId: 2,
      mensajes: [
        {
          id: 1,
          autor: 'TUTOR',
          texto: 'Hola, te envío el material de lectura para revisar estructura académica.',
          hora: '5:10 p. m.',
        },
        {
          id: 2,
          autor: 'ESTUDIANTE',
          texto: '¡Muchas gracias Camila! Lo leeré antes de nuestra sesión.',
          hora: '5:22 p. m.',
        },
      ],
    },
    {
      id: 3,
      tutorId: 2,
      nombre: 'Andrés Torres',
      inicial: 'A',
      materias: 'Programación y datos',
      enLinea: false,
      tiempoRespuesta: 'responde normalmente en 3 h',
      ultimoMensaje: 'La reserva quedó confirmada.',
      ultimaHora: 'Lun',
      contextoEstado: 'Tutoría confirmada',
      contextoDetalle: 'Bases de datos · 22 sep · 2:00 p. m.',
      reservaId: 3,
      mensajes: [
        {
          id: 1,
          autor: 'TUTOR',
          texto: 'La reserva quedó confirmada. Nos vemos en el laboratorio de ingeniería.',
          hora: '11:05 a. m.',
        },
      ],
    },
  ]);

  readonly eventosCalendario = signal<EventoCalendario[]>([
    {
      id: 1,
      codigo: 'TL-2026-0908',
      diaMes: 8,
      mesTexto: 'Septiembre 2026',
      fechaCorta: '08 SEP',
      fechaLarga: 'Martes, 8 de septiembre de 2026',
      titulo: 'Cálculo con Laura',
      materia: 'Cálculo',
      tema: 'Derivadas e integrales',
      tutorNombre: 'Laura Mendoza',
      tutorSubtitulo: 'Tutora de Cálculo y Física',
      tutorCalificacion: '4,9',
      horaInicio: '4:00 p. m.',
      rangoHora: '4:00 p. m. – 5:00 p. m.',
      duracionMinutos: 60,
      modalidad: 'En línea',
      enlace: 'meet.google.com/abc-defg-hij',
      valorCop: 45000,
      mensajeInicial: 'Necesito reforzar integrales por sustitución para mi próximo parcial.',
      estado: 'CONFIRMADA',
    },
    {
      id: 2,
      codigo: 'TL-2026-0903',
      diaMes: 3,
      mesTexto: 'Septiembre 2026',
      fechaCorta: '03 SEP',
      fechaLarga: 'Jueves, 3 de septiembre de 2026',
      titulo: 'Física con Laura',
      materia: 'Pendiente',
      tema: 'Cinemática y dinámica',
      tutorNombre: 'Laura Mendoza',
      tutorSubtitulo: 'Tutora de Cálculo y Física',
      tutorCalificacion: '4,9',
      horaInicio: '4:00 p. m.',
      rangoHora: '4:00 p. m. – 5:00 p. m.',
      duracionMinutos: 60,
      modalidad: 'En línea',
      enlace: 'meet.google.com/fis-2026-myt',
      valorCop: 45000,
      mensajeInicial: 'Repaso de ejercicios de segunda ley de Newton.',
      estado: 'PENDIENTE',
    },
    {
      id: 3,
      codigo: 'TL-2026-0915',
      diaMes: 15,
      mesTexto: 'Septiembre 2026',
      fechaCorta: '15 SEP',
      fechaLarga: 'Martes, 15 de septiembre de 2026',
      titulo: 'Inglés con Camila',
      materia: 'Inglés',
      tema: 'Escritura académica y speaking',
      tutorNombre: 'Camila Rojas',
      tutorSubtitulo: 'Tutora de Inglés académico',
      tutorCalificacion: '4,9',
      horaInicio: '6:00 p. m.',
      rangoHora: '6:00 p. m. – 7:00 p. m.',
      duracionMinutos: 60,
      modalidad: 'En línea',
      enlace: 'meet.google.com/eng-cam-myt',
      valorCop: 42000,
      mensajeInicial: 'Preparación de presentación oral en inglés.',
      estado: 'CONFIRMADA',
    },
    {
      id: 4,
      codigo: 'TL-2026-0922',
      diaMes: 22,
      mesTexto: 'Septiembre 2026',
      fechaCorta: '22 SEP',
      fechaLarga: 'Martes, 22 de septiembre de 2026',
      titulo: 'Bases de datos',
      materia: 'Bases de datos',
      tema: 'Normalización e índices en PostgreSQL',
      tutorNombre: 'Andrés Torres',
      tutorSubtitulo: 'Tutor de Programación y Datos',
      tutorCalificacion: '4,8',
      horaInicio: '2:00 p. m.',
      rangoHora: '2:00 p. m. – 3:00 p. m.',
      duracionMinutos: 60,
      modalidad: 'Presencial',
      enlace: ' Edificio Ingeniería · Sala 302',
      valorCop: 50000,
      mensajeInicial: 'Revisión del modelo entidad-relación del proyecto.',
      estado: 'PENDIENTE',
    },
  ]);

  readonly estudiantesBase = signal<EstudianteRegistro[]>([
    {
      id: 1,
      usuarioId: 5,
      nombreCompleto: 'Juan Pérez',
      correo: 'estudiante01@myt.edu.co',
      codigoEstudiantil: '20261001',
      universidad: 'Universidad Nacional',
      programaAcademico: 'Ingeniería de Sistemas',
      semestre: 5,
      activo: true,
    },
    {
      id: 2,
      usuarioId: 6,
      nombreCompleto: 'Maria Rodríguez',
      correo: 'estudiante02@myt.edu.co',
      codigoEstudiantil: '20261002',
      universidad: 'Universidad de los Andes',
      programaAcademico: 'Ingeniería Industrial',
      semestre: 4,
      activo: true,
    },
    {
      id: 3,
      usuarioId: 7,
      nombreCompleto: 'Samuel Pico',
      correo: 'samuel.estudiante@myt.edu.co',
      codigoEstudiantil: '20261030',
      universidad: 'Pontificia Universidad Javeriana',
      programaAcademico: 'Ingeniería de Sistemas',
      semestre: 6,
      activo: true,
    },
  ]);

  readonly ultimaSolicitudConfirmada = signal<{
    tutora: string;
    tema: string;
    fecha: string;
    hora: string;
    modalidad: string;
    valor: number;
  }>({
    tutora: 'Laura Mendoza',
    tema: 'Derivadas e integrales',
    fecha: 'Martes, 8 de septiembre de 2026',
    hora: '4:00 p. m. – 5:00 p. m.',
    modalidad: 'En línea',
    valor: 45000,
  });

  readonly ultimaReservaConfirmada = signal<{
    id: number;
    tutorId: number;
    tutorNombre: string;
    tutorEspecialidad: string;
    tema: string;
    fechaTexto: string;
    horarioTexto: string;
    modalidad: string;
    duracionMinutos: number;
    valorTotal: number;
    estado: string;
    notasEstudiante: string;
  }>({
    id: 1,
    tutorId: 1,
    tutorNombre: 'Laura Mendoza',
    tutorEspecialidad: 'Cálculo y Física · Tutoría personalizada',
    tema: 'Derivadas e integrales',
    fechaTexto: 'Martes, 8 de septiembre de 2026',
    horarioTexto: '4:00 p. m. – 5:00 p. m.',
    modalidad: 'En línea (videollamada)',
    duracionMinutos: 60,
    valorTotal: 45000,
    estado: 'PENDIENTE',
    notasEstudiante: 'Ejercicios de sustitución trigonométrica.',
  });

  registrarReservaConfirmada(datos: {
    id: number;
    tutorId: number;
    tutorNombre: string;
    tutorEspecialidad: string;
    tema: string;
    fechaTexto: string;
    horarioTexto: string;
    modalidad: string;
    duracionMinutos: number;
    valorTotal: number;
    estado: string;
    notasEstudiante: string;
  }): void {
    this.ultimaReservaConfirmada.set(datos);
    this.ultimaSolicitudConfirmada.set({
      tutora: datos.tutorNombre,
      tema: datos.tema,
      fecha: datos.fechaTexto,
      hora: datos.horarioTexto,
      modalidad: datos.modalidad,
      valor: datos.valorTotal,
    });
  }

  enviarMensaje(conversacionId: number, texto: string): void {
    const limpio = texto.trim();
    if (!limpio) return;
    const ahora = new Date().toLocaleTimeString('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
    });
    this.conversaciones.update((lista) =>
      lista.map((c) =>
        c.id === conversacionId
          ? {
              ...c,
              ultimoMensaje: limpio,
              ultimaHora: 'Ahora',
              mensajes: [
                ...c.mensajes,
                {
                  id: c.mensajes.length + 1,
                  autor: 'ESTUDIANTE',
                  texto: limpio,
                  hora: ahora,
                },
              ],
            }
          : c,
      ),
    );
  }

  agregarResena(nueva: Omit<ResenaItem, 'id' | 'fecha'>): void {
    this.resenas.update((actuales) => [
      {
        ...nueva,
        id: actuales.length + 1,
        fecha: 'Hoy',
      },
      ...actuales,
    ]);
  }

  reprogramarEvento(id: number, nuevaFechaIso: string, nuevoHorario: string): void {
    const partes = nuevaFechaIso.split('-');
    const dia = Number(partes[2]) || 10;
    this.eventosCalendario.update((lista) =>
      lista.map((ev) =>
        ev.id === id
          ? {
              ...ev,
              diaMes: dia,
              fechaCorta: `${String(dia).padStart(2, '0')} SEP`,
              fechaLarga: `${dia} de septiembre de 2026`,
              horaInicio: nuevoHorario,
              rangoHora: `${nuevoHorario} (reprogramada)`,
              estado: 'PENDIENTE',
            }
          : ev,
      ),
    );
  }

  cancelarEvento(id: number): void {
    this.eventosCalendario.update((lista) =>
      lista.map((ev) => (ev.id === id ? { ...ev, estado: 'CANCELADA' } : ev)),
    );
  }
}
