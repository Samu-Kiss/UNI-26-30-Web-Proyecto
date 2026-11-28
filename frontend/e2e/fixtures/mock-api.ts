import { Page, Route } from '@playwright/test';

export type RolMyt = 'ADMINISTRADOR' | 'ESTUDIANTE' | 'TUTOR';

export interface MockSesion {
  rol: RolMyt;
  perfilId: number;
  nombreUsuario: string;
  rolSeguridad?: 'ADMIN' | 'USER';
}

export interface MockMateria {
  id: number;
  nombre: string;
}

export interface MockTutor {
  id: number;
  usuarioId: number;
  nombre: string;
  biografia: string;
  tarifaPorHora: number;
  disponible: boolean;
  materias: MockMateria[];
  calificacion: number | null;
}

export interface MockReserva {
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
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'EN_CURSO' | 'COMPLETADA' | 'RECHAZADA' | 'CANCELADA';
  costoTotal: number;
  modalidad?: 'VIRTUAL' | 'PRESENCIAL';
  objetivo?: string;
  motivoCancelacion?: string;
  estudianteCorreo?: string;
  estudianteTelefono?: string;
  estadoPago?: 'SIN_PAGO' | 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
  referenciaPago?: string | null;
}

export interface MockUsuario {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  activo: boolean;
  roles: RolMyt[];
}

export interface MockResena {
  id: number;
  reservaId: number;
  tutorId: number;
  tutor: string;
  estudiante: string;
  calificacion: number;
  comentario: string;
  fecha: string;
}

export interface MockMensaje {
  id: number;
  autor: string;
  contenido: string;
  fecha: string;
}

export interface MockAgenda {
  horarios: { diaSemana: string; horaInicio: string; horaFin: string }[];
  bloqueos: { fecha: string; horaInicio: string; horaFin: string; motivo: string }[];
}

export interface MockBackendState {
  sesionActual: MockSesion | null;
  opcionesPerfil: string[];
  materias: MockMateria[];
  tutores: MockTutor[];
  reservas: MockReserva[];
  usuarios: MockUsuario[];
  resenas: MockResena[];
  mensajesPorReserva: Record<number, MockMensaje[]>;
  agendasPorTutor: Record<number, MockAgenda>;
}

export function fechaFuturaBogota(dias = 2): string {
  const hoyStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
  const fecha = new Date(`${hoyStr}T12:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
}

export function crearEstadoInicial(sesionInicial: MockSesion | null = null): MockBackendState {
  const manana = fechaFuturaBogota(1);
  const pasadoManana = fechaFuturaBogota(2);

  return {
    sesionActual: sesionInicial,
    opcionesPerfil: [],
    materias: [
      { id: 1, nombre: 'Cálculo Diferencial' },
      { id: 2, nombre: 'Programación Web' },
      { id: 3, nombre: 'Inglés Académico' },
      { id: 4, nombre: 'Física Mecánica' },
    ],
    tutores: [
      {
        id: 1,
        usuarioId: 3,
        nombre: 'Felipe Morales',
        biografia: 'Magíster en Matemáticas Aplicadas con 6 años de experiencia docente.',
        tarifaPorHora: 45000,
        disponible: true,
        materias: [
          { id: 1, nombre: 'Cálculo Diferencial' },
          { id: 4, nombre: 'Física Mecánica' },
        ],
        calificacion: 4.9,
      },
      {
        id: 2,
        usuarioId: 4,
        nombre: 'Elena Guerrero',
        biografia: 'Ingeniera de Software especialista en Angular, Spring Boot y arquitectura web.',
        tarifaPorHora: 55000,
        disponible: true,
        materias: [{ id: 2, nombre: 'Programación Web' }],
        calificacion: 4.8,
      },
      {
        id: 3,
        usuarioId: 5,
        nombre: 'Rosa Mendoza',
        biografia: 'Docente certificada en preparación TOEFL e inglés conversacional.',
        tarifaPorHora: 38000,
        disponible: true,
        materias: [{ id: 3, nombre: 'Inglés Académico' }],
        calificacion: null,
      },
      {
        id: 4,
        usuarioId: 6,
        nombre: 'Carlos Duarte',
        biografia: 'Tutor de algoritmos, estructuras de datos y bases de datos relacionales.',
        tarifaPorHora: 42000,
        disponible: true,
        materias: [{ id: 2, nombre: 'Programación Web' }],
        calificacion: 4.6,
      },
      {
        id: 5,
        usuarioId: 7,
        nombre: 'Andrés Salazar',
        biografia: 'Físico teórico con énfasis en mecánica clásica y electromagnetismo.',
        tarifaPorHora: 50000,
        disponible: true,
        materias: [{ id: 4, nombre: 'Física Mecánica' }],
        calificacion: 4.7,
      },
      {
        id: 6,
        usuarioId: 8,
        nombre: 'Laura Castellanos',
        biografia: 'Matemática pura especializada en álgebra lineal y cálculo integral.',
        tarifaPorHora: 40000,
        disponible: true,
        materias: [{ id: 1, nombre: 'Cálculo Diferencial' }],
        calificacion: 4.5,
      },
      {
        id: 7,
        usuarioId: 9,
        nombre: 'Camila Rincón',
        biografia: 'Desarrolladora full-stack y mentora en pruebas automatizadas E2E.',
        tarifaPorHora: 60000,
        disponible: true,
        materias: [{ id: 2, nombre: 'Programación Web' }],
        calificacion: 5.0,
      },
    ],
    reservas: [
      {
        id: 101,
        tutorId: 1,
        estudianteId: 1,
        tutor: 'Felipe Morales',
        estudiante: 'Juan Pérez',
        materia: 'Cálculo Diferencial',
        fecha: manana,
        horaInicio: '10:00:00',
        duracionMinutos: 60,
        tema: 'Límites y continuidad en funciones trigonométricas',
        estado: 'PENDIENTE',
        costoTotal: 45000,
        modalidad: 'VIRTUAL',
        objetivo: 'Preparar examen',
        estudianteCorreo: 'estudiante01@myt.edu.co',
        estudianteTelefono: '3001234567',
        estadoPago: 'SIN_PAGO',
      },
      {
        id: 102,
        tutorId: 2,
        estudianteId: 1,
        tutor: 'Elena Guerrero',
        estudiante: 'Juan Pérez',
        materia: 'Programación Web',
        fecha: pasadoManana,
        horaInicio: '14:00:00',
        duracionMinutos: 90,
        tema: 'Pruebas E2E con Playwright y Angular',
        estado: 'CONFIRMADA',
        costoTotal: 82500,
        modalidad: 'VIRTUAL',
        objetivo: 'Revisar proyecto',
        estudianteCorreo: 'estudiante01@myt.edu.co',
        estudianteTelefono: '3001234567',
        estadoPago: 'SIN_PAGO',
      },
      {
        id: 103,
        tutorId: 1,
        estudianteId: 1,
        tutor: 'Felipe Morales',
        estudiante: 'Juan Pérez',
        materia: 'Cálculo Diferencial',
        fecha: '2026-10-15',
        horaInicio: '09:00:00',
        duracionMinutos: 60,
        tema: 'Derivadas implícitas y regla de la cadena',
        estado: 'COMPLETADA',
        costoTotal: 45000,
        modalidad: 'PRESENCIAL',
        objetivo: 'Resolver ejercicios',
        estudianteCorreo: 'estudiante01@myt.edu.co',
        estudianteTelefono: '3001234567',
        estadoPago: 'APPROVED',
        referenciaPago: 'MYT-RES-103',
      },
    ],
    usuarios: [
      {
        id: 1,
        nombre: 'Juan David',
        apellido: 'Ortiz',
        correo: 'admin.ortiz@myt.edu.co',
        telefono: '3101112233',
        activo: true,
        roles: ['ADMINISTRADOR'],
      },
      {
        id: 2,
        nombre: 'Juan',
        apellido: 'Pérez',
        correo: 'estudiante01@myt.edu.co',
        telefono: '3001234567',
        activo: true,
        roles: ['ESTUDIANTE'],
      },
      {
        id: 3,
        nombre: 'Felipe',
        apellido: 'Morales',
        correo: 'tutor01@myt.edu.co',
        telefono: '3159876543',
        activo: true,
        roles: ['TUTOR'],
      },
      {
        id: 4,
        nombre: 'Maria',
        apellido: 'Rodríguez',
        correo: 'estudiante02@myt.edu.co',
        telefono: '3205556677',
        activo: true,
        roles: ['ESTUDIANTE'],
      },
    ],
    resenas: [
      {
        id: 1,
        reservaId: 999,
        tutorId: 1,
        tutor: 'Felipe Morales',
        estudiante: 'Maria Rodríguez',
        calificacion: 5,
        comentario: 'Excelente explicación de límites y derivadas con ejemplos claros.',
        fecha: '2026-10-10',
      },
    ],
    mensajesPorReserva: {
      101: [
        {
          id: 1,
          autor: 'Felipe Morales',
          contenido: 'Hola Juan, recuerda tener listos los ejercicios del taller.',
          fecha: '2026-11-25T14:00:00',
        },
      ],
    },
    agendasPorTutor: {
      1: {
        horarios: [
          { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '18:00' },
          { diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '18:00' },
          { diaSemana: 'MIERCOLES', horaInicio: '08:00', horaFin: '18:00' },
          { diaSemana: 'JUEVES', horaInicio: '08:00', horaFin: '18:00' },
          { diaSemana: 'VIERNES', horaInicio: '08:00', horaFin: '18:00' },
          { diaSemana: 'SABADO', horaInicio: '09:00', horaFin: '15:00' },
          { diaSemana: 'DOMINGO', horaInicio: '09:00', horaFin: '15:00' },
        ],
        bloqueos: [],
      },
      2: {
        horarios: [
          { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '18:00' },
          { diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '18:00' },
          { diaSemana: 'MIERCOLES', horaInicio: '08:00', horaFin: '18:00' },
          { diaSemana: 'JUEVES', horaInicio: '08:00', horaFin: '18:00' },
          { diaSemana: 'VIERNES', horaInicio: '08:00', horaFin: '18:00' },
        ],
        bloqueos: [],
      },
    },
  };
}

function jsonResponse(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function configurarApiMock(
  page: Page,
  sesionInicial: MockSesion | null = null,
): Promise<MockBackendState> {
  const state = crearEstadoInicial(sesionInicial);

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const path = url.pathname;

    // 1. Sesión y Autenticación
    if (path === '/api/sesion' && method === 'GET') {
      return jsonResponse(route, {
        actual: state.sesionActual,
        opciones: state.opcionesPerfil,
      });
    }

    if (path === '/api/sesion/login' && method === 'POST') {
      const payload = req.postDataJSON() as { correo?: string; contrasena?: string };
      const correo = (payload?.correo ?? '').toLowerCase().trim();
      const contrasena = payload?.contrasena ?? '';

      if (contrasena !== '1ManzanaGrande!' && contrasena !== 'NuevaClave2026!') {
        return jsonResponse(route, { mensaje: 'Credenciales inválidas.' }, 401);
      }

      const usuarioDb = state.usuarios.find((u) => u.correo.toLowerCase() === correo);
      if (usuarioDb && !usuarioDb.activo) {
        return jsonResponse(
          route,
          { mensaje: 'Tu cuenta está desactivada. Contacta a soporte.' },
          403,
        );
      }

      if (correo === 'dual@myt.edu.co') {
        state.sesionActual = null;
        state.opcionesPerfil = ['ESTUDIANTE', 'TUTOR'];
        return jsonResponse(route, { actual: null, opciones: state.opcionesPerfil });
      }

      if (correo === 'admin@myt.edu.co' || correo === 'admin.ortiz@myt.edu.co') {
        state.sesionActual = {
          rol: 'ADMINISTRADOR',
          perfilId: 1,
          nombreUsuario: 'Juan David Ortiz',
          rolSeguridad: 'ADMIN',
        };
      } else if (correo === 'user2@myt.edu.co' || correo === 'tutor01@myt.edu.co') {
        state.sesionActual = {
          rol: 'TUTOR',
          perfilId: 1,
          nombreUsuario: 'Felipe Morales',
          rolSeguridad: 'USER',
        };
      } else if (correo === 'tutornuevo@myt.edu.co') {
        state.sesionActual = {
          rol: 'TUTOR',
          perfilId: 99,
          nombreUsuario: 'Tutor Nuevo',
          rolSeguridad: 'USER',
        };
        state.agendasPorTutor[99] = { horarios: [], bloqueos: [] };
      } else {
        state.sesionActual = {
          rol: 'ESTUDIANTE',
          perfilId: 1,
          nombreUsuario: 'Juan Pérez',
          rolSeguridad: 'USER',
        };
      }
      state.opcionesPerfil = [];
      return jsonResponse(route, { actual: state.sesionActual, opciones: [] });
    }

    if (path === '/api/sesion/perfil' && method === 'POST') {
      const payload = req.postDataJSON() as { perfil: RolMyt };
      state.sesionActual = {
        rol: payload.perfil,
        perfilId: 1,
        nombreUsuario: payload.perfil === 'TUTOR' ? 'Felipe Morales' : 'Juan Pérez',
        rolSeguridad: payload.perfil === 'ADMINISTRADOR' ? 'ADMIN' : 'USER',
      };
      state.opcionesPerfil = [];
      return jsonResponse(route, { actual: state.sesionActual, opciones: [] });
    }

    if (path === '/api/sesion/recuperar' && method === 'POST') {
      return jsonResponse(route, {
        mensaje: 'Se ha generado un código temporal de recuperación.',
        tokenRecuperacion: 'MYT-REC-2026',
        expiraEnMinutos: 15,
      });
    }

    if (path === '/api/sesion/restablecer' && method === 'POST') {
      return jsonResponse(route, {
        mensaje: 'Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.',
      });
    }

    if (path === '/api/sesion/logout' && method === 'POST') {
      state.sesionActual = null;
      state.opcionesPerfil = [];
      return route.fulfill({ status: 204, body: '' });
    }

    // 2. Estadísticas públicas
    if (path === '/api/public/estadisticas' && method === 'GET') {
      return jsonResponse(route, {
        plataforma: 'MyT',
        estado: 'UP',
        tutoresDisponibles: state.tutores.filter((t) => t.disponible).length,
        materiasActivas: state.materias.length,
        materias: state.materias,
      });
    }

    // 3. Materias y Tutores
    if (path === '/api/tutores/materias' && method === 'GET') {
      return jsonResponse(route, state.materias);
    }

    const tutorAgendaHorasMatch = path.match(/^\/api\/tutores\/(\d+)\/agenda\/horas$/);
    if (tutorAgendaHorasMatch && method === 'GET') {
      const duracion = Number(url.searchParams.get('duracion') ?? '60');
      if (duracion === 120) {
        return jsonResponse(route, ['09:00:00', '11:00:00', '14:00:00']);
      }
      return jsonResponse(route, ['09:00:00', '10:00:00', '11:30:00', '14:00:00', '16:00:00']);
    }

    const tutorAgendaMatch = path.match(/^\/api\/tutores\/(\d+)\/agenda$/);
    if (tutorAgendaMatch) {
      const tutorId = Number(tutorAgendaMatch[1]);
      if (method === 'GET') {
        return jsonResponse(
          route,
          state.agendasPorTutor[tutorId] ?? state.agendasPorTutor[1] ?? { horarios: [], bloqueos: [] },
        );
      }
      if (method === 'PUT') {
        const nuevaAgenda = req.postDataJSON() as MockAgenda;
        state.agendasPorTutor[tutorId] = nuevaAgenda;
        return jsonResponse(route, nuevaAgenda);
      }
    }

    const tutorDetalleMatch = path.match(/^\/api\/tutores\/(\d+)$/);
    if (tutorDetalleMatch) {
      const tutorId = Number(tutorDetalleMatch[1]);
      const index = state.tutores.findIndex((t) => t.id === tutorId);
      if (index === -1) {
        return jsonResponse(route, { mensaje: 'Tutor no encontrado.' }, 404);
      }
      if (method === 'GET') {
        return jsonResponse(route, state.tutores[index]);
      }
      if (method === 'PUT') {
        const body = req.postDataJSON() as {
          biografia: string;
          tarifaPorHora: number;
          disponible: boolean;
          materiaIds?: number[];
          nuevasMaterias?: string[];
        };
        const materiasActualizadas: MockMateria[] = [];
        if (body.materiaIds?.length) {
          for (const id of body.materiaIds) {
            const m = state.materias.find((mat) => mat.id === id);
            if (m) materiasActualizadas.push(m);
          }
        }
        if (body.nuevasMaterias?.length) {
          for (const nombre of body.nuevasMaterias) {
            let existente = state.materias.find(
              (m) => m.nombre.toLowerCase() === nombre.toLowerCase(),
            );
            if (!existente) {
              existente = { id: state.materias.length + 1, nombre };
              state.materias.push(existente);
            }
            if (!materiasActualizadas.some((m) => m.id === existente!.id)) {
              materiasActualizadas.push(existente);
            }
          }
        }
        state.tutores[index] = {
          ...state.tutores[index],
          biografia: body.biografia,
          tarifaPorHora: Number(body.tarifaPorHora),
          disponible: body.disponible,
          materias:
            materiasActualizadas.length > 0 ? materiasActualizadas : state.tutores[index].materias,
        };
        return jsonResponse(route, state.tutores[index]);
      }
      if (method === 'DELETE') {
        state.tutores[index] = { ...state.tutores[index], disponible: false };
        return route.fulfill({ status: 204, body: '' });
      }
    }

    if (path === '/api/tutores' && method === 'GET') {
      const pageNum = Number(url.searchParams.get('page') ?? '0');
      const size = Number(url.searchParams.get('size') ?? '6');
      const q = (url.searchParams.get('q') ?? '').toLowerCase().trim();
      const materiaId = url.searchParams.get('materiaId') ?? '';
      const tarifaMax = url.searchParams.get('tarifaMax') ?? '';

      let filtrados = [...state.tutores];
      if (q) {
        filtrados = filtrados.filter(
          (t) =>
            t.nombre.toLowerCase().includes(q) ||
            t.biografia.toLowerCase().includes(q) ||
            t.materias.some((m) => m.nombre.toLowerCase().includes(q)),
        );
      }
      if (materiaId) {
        filtrados = filtrados.filter((t) => t.materias.some((m) => String(m.id) === materiaId));
      }
      if (tarifaMax) {
        filtrados = filtrados.filter((t) => t.tarifaPorHora <= Number(tarifaMax));
      }

      const totalElements = filtrados.length;
      const totalPages = Math.max(1, Math.ceil(totalElements / size));
      const start = pageNum * size;
      const content = filtrados.slice(start, start + size);

      return jsonResponse(route, {
        content,
        totalElements,
        totalPages,
        number: pageNum,
      });
    }

    if (path === '/api/tutores' && method === 'POST') {
      const body = req.postDataJSON() as {
        usuarioId: number;
        biografia: string;
        tarifaPorHora: number;
        materiaIds: number[];
      };
      if (state.tutores.some((t) => t.usuarioId === Number(body.usuarioId))) {
        return jsonResponse(
          route,
          { mensaje: 'El usuario ya cuenta con un perfil de tutor registrado.' },
          409,
        );
      }
      const usuario = state.usuarios.find((u) => u.id === Number(body.usuarioId));
      const nuevoTutor: MockTutor = {
        id: state.tutores.length + 1,
        usuarioId: Number(body.usuarioId),
        nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : `Tutor #${body.usuarioId}`,
        biografia: body.biografia,
        tarifaPorHora: Number(body.tarifaPorHora),
        disponible: true,
        materias: state.materias.filter((m) => body.materiaIds.includes(m.id)),
        calificacion: null,
      };
      state.tutores.unshift(nuevoTutor);
      return jsonResponse(route, nuevoTutor, 201);
    }

    // 4. Reservas
    const reservaEstadoMatch = path.match(/^\/api\/reservas\/(\d+)\/estado$/);
    if (reservaEstadoMatch && method === 'PUT') {
      const reservaId = Number(reservaEstadoMatch[1]);
      const body = req.postDataJSON() as {
        estado: MockReserva['estado'];
        motivo?: string;
      };
      const reserva = state.reservas.find((r) => r.id === reservaId);
      if (!reserva) {
        return jsonResponse(route, { mensaje: 'Reserva no encontrada.' }, 404);
      }
      reserva.estado = body.estado;
      if (body.motivo) {
        reserva.motivoCancelacion = body.motivo;
      }
      return jsonResponse(route, reserva);
    }

    const reservaIdMatch = path.match(/^\/api\/reservas\/(\d+)$/);
    if (reservaIdMatch) {
      const reservaId = Number(reservaIdMatch[1]);
      const reserva = state.reservas.find((r) => r.id === reservaId);
      if (!reserva) {
        return jsonResponse(route, { mensaje: 'Reserva no encontrada.' }, 404);
      }
      if (method === 'GET') {
        return jsonResponse(route, reserva);
      }
      if (method === 'DELETE') {
        reserva.estado = 'CANCELADA';
        reserva.motivoCancelacion = url.searchParams.get('motivo') ?? 'Cancelada por el usuario';
        return route.fulfill({ status: 204, body: '' });
      }
    }

    if (path === '/api/reservas' && method === 'GET') {
      const estadoFiltro = url.searchParams.get('estado') ?? '';
      const lista = estadoFiltro
        ? state.reservas.filter((r) => r.estado === estadoFiltro)
        : state.reservas;
      return jsonResponse(route, lista);
    }

    if (path === '/api/reservas' && method === 'POST') {
      const body = req.postDataJSON() as {
        tutorId: number;
        materiaId: number;
        fecha: string;
        horaInicio: string;
        duracionMinutos: number;
        tema: string;
        objetivo?: string;
        modalidad: 'VIRTUAL' | 'PRESENCIAL';
      };
      const tutor = state.tutores.find((t) => t.id === Number(body.tutorId)) ?? state.tutores[0];
      const materia =
        state.materias.find((m) => m.id === Number(body.materiaId)) ?? tutor.materias[0];
      const nuevaReserva: MockReserva = {
        id: 200 + state.reservas.length + 1,
        tutorId: tutor.id,
        estudianteId: 1,
        tutor: tutor.nombre,
        estudiante: state.sesionActual?.nombreUsuario ?? 'Juan Pérez',
        materia: materia?.nombre ?? 'Cálculo Diferencial',
        fecha: body.fecha,
        horaInicio: body.horaInicio,
        duracionMinutos: Number(body.duracionMinutos),
        tema: body.tema,
        estado: 'PENDIENTE',
        costoTotal: (tutor.tarifaPorHora * Number(body.duracionMinutos)) / 60,
        modalidad: body.modalidad,
        objetivo: body.objetivo ?? 'Preparar examen',
        estudianteCorreo: 'estudiante01@myt.edu.co',
        estudianteTelefono: '3001234567',
        estadoPago: 'SIN_PAGO',
      };
      state.reservas.unshift(nuevaReserva);
      state.mensajesPorReserva[nuevaReserva.id] = [];
      return jsonResponse(route, nuevaReserva, 201);
    }

    // 5. Chat
    const chatMatch = path.match(/^\/api\/chat\/(\d+)$/);
    if (chatMatch) {
      const reservaId = Number(chatMatch[1]);
      if (method === 'GET') {
        return jsonResponse(route, state.mensajesPorReserva[reservaId] ?? []);
      }
      if (method === 'POST') {
        const body = req.postDataJSON() as { contenido: string };
        const lista = state.mensajesPorReserva[reservaId] ?? [];
        const nuevoMensaje: MockMensaje = {
          id: lista.length + 1,
          autor: state.sesionActual?.nombreUsuario ?? 'Juan Pérez',
          contenido: body.contenido,
          fecha: new Date().toISOString(),
        };
        lista.push(nuevoMensaje);
        state.mensajesPorReserva[reservaId] = lista;
        return jsonResponse(route, nuevoMensaje, 201);
      }
    }

    // 6. Reseñas
    if (path === '/api/resenas' && method === 'GET') {
      const tutorId = url.searchParams.get('tutorId');
      const lista = tutorId
        ? state.resenas.filter((r) => String(r.tutorId) === tutorId)
        : state.resenas;
      return jsonResponse(route, lista);
    }

    if (path === '/api/resenas' && method === 'POST') {
      const body = req.postDataJSON() as {
        reservaId: number;
        calificacion: number;
        comentario: string;
      };
      const reserva = state.reservas.find((r) => r.id === Number(body.reservaId));
      const nuevaResena: MockResena = {
        id: state.resenas.length + 1,
        reservaId: Number(body.reservaId),
        tutorId: reserva?.tutorId ?? 1,
        tutor: reserva?.tutor ?? 'Felipe Morales',
        estudiante: state.sesionActual?.nombreUsuario ?? 'Juan Pérez',
        calificacion: Number(body.calificacion),
        comentario: body.comentario,
        fecha: new Date().toISOString().slice(0, 10),
      };
      state.resenas.unshift(nuevaResena);
      return jsonResponse(route, nuevaResena, 201);
    }

    // 7. Usuarios y Administración
    const usuarioActivoMatch = path.match(/^\/api\/usuarios\/(\d+)\/activo$/);
    if (usuarioActivoMatch && method === 'PUT') {
      const id = Number(usuarioActivoMatch[1]);
      const body = req.postDataJSON() as { activo: boolean };
      const u = state.usuarios.find((x) => x.id === id);
      if (u) u.activo = body.activo;
      return route.fulfill({ status: 204, body: '' });
    }

    const usuarioPerfilesMatch = path.match(/^\/api\/usuarios\/(\d+)\/perfiles$/);
    if (usuarioPerfilesMatch && method === 'POST') {
      const id = Number(usuarioPerfilesMatch[1]);
      const body = req.postDataJSON() as { rol: RolMyt };
      const u = state.usuarios.find((x) => x.id === id);
      if (u && !u.roles.includes(body.rol)) {
        u.roles.push(body.rol);
      }
      return route.fulfill({ status: 204, body: '' });
    }

    const usuarioIdMatch = path.match(/^\/api\/usuarios\/(\d+)$/);
    if (usuarioIdMatch) {
      const id = Number(usuarioIdMatch[1]);
      const index = state.usuarios.findIndex((x) => x.id === id);
      if (index === -1) {
        return jsonResponse(route, { mensaje: 'Usuario no encontrado.' }, 404);
      }
      if (method === 'GET') {
        return jsonResponse(route, state.usuarios[index]);
      }
      if (method === 'PUT') {
        const body = req.postDataJSON() as Partial<MockUsuario>;
        state.usuarios[index] = { ...state.usuarios[index], ...body };
        return jsonResponse(route, state.usuarios[index]);
      }
      if (method === 'DELETE') {
        state.usuarios.splice(index, 1);
        return route.fulfill({ status: 204, body: '' });
      }
    }

    if (path === '/api/usuarios' && method === 'GET') {
      if (state.sesionActual?.rol !== 'ADMINISTRADOR') {
        return jsonResponse(
          route,
          { mensaje: 'Acceso denegado: se requiere rol ADMINISTRADOR.' },
          403,
        );
      }
      return jsonResponse(route, state.usuarios);
    }

    if (path === '/api/usuarios' && method === 'POST') {
      const body = req.postDataJSON() as {
        nombre: string;
        apellido: string;
        correo: string;
        telefono?: string;
        rol?: RolMyt;
      };
      if (state.usuarios.some((u) => u.correo.toLowerCase() === body.correo.toLowerCase())) {
        return jsonResponse(route, { mensaje: 'El correo ya está registrado.' }, 409);
      }
      const nuevoUsuario: MockUsuario = {
        id: state.usuarios.length + 1,
        nombre: body.nombre,
        apellido: body.apellido,
        correo: body.correo,
        telefono: body.telefono ?? '',
        activo: true,
        roles: [body.rol ?? 'ESTUDIANTE'],
      };
      state.usuarios.push(nuevoUsuario);
      return route.fulfill({ status: 201, body: '' });
    }

    // 8. Estudiantes (directorio administrativo)
    if (path === '/api/estudiantes' && method === 'GET') {
      if (state.sesionActual?.rol !== 'ADMINISTRADOR') {
        return jsonResponse(route, { mensaje: 'Acceso restringido a administradores.' }, 403);
      }
      return jsonResponse(route, [
        {
          id: 1,
          usuarioId: 2,
          nombreCompleto: 'Juan Pérez',
          correo: 'estudiante01@myt.edu.co',
          codigoEstudiantil: '20261001',
          universidad: 'Pontificia Universidad Javeriana',
          programaAcademico: 'Ingeniería de Sistemas',
          semestre: 6,
          activo: state.usuarios.find((u) => u.id === 2)?.activo ?? true,
        },
        {
          id: 2,
          usuarioId: 4,
          nombreCompleto: 'Maria Rodríguez',
          correo: 'estudiante02@myt.edu.co',
          codigoEstudiantil: '20261002',
          universidad: 'Pontificia Universidad Javeriana',
          programaAcademico: 'Ingeniería Industrial',
          semestre: 5,
          activo: state.usuarios.find((u) => u.id === 4)?.activo ?? true,
        },
      ]);
    }

    // 9. Perfil propio
    if (path === '/api/perfil' && method === 'GET') {
      const rol = state.sesionActual?.rol ?? 'ESTUDIANTE';
      const u =
        rol === 'ADMINISTRADOR'
          ? state.usuarios[0]
          : rol === 'TUTOR'
            ? state.usuarios[2]
            : state.usuarios[1];
      return jsonResponse(route, u);
    }

    if (path === '/api/perfil' && method === 'PUT') {
      const body = req.postDataJSON() as MockUsuario;
      return jsonResponse(route, body);
    }

    // 10. Pagos Wompi
    if (path === '/api/pagos/configuracion' && method === 'GET') {
      return jsonResponse(route, { habilitado: true, moneda: 'COP' });
    }

    if (path === '/api/pagos/ordenes' && method === 'GET') {
      return jsonResponse(route, []);
    }

    if (path === '/api/pagos/checkout' && method === 'POST') {
      const body = (req.postDataJSON() ?? {}) as { reservaId?: number };
      return jsonResponse(route, {
        url: 'https://checkout.wompi.co/p/?public-key=pub_test_123',
        referencia: `MYT-WOMPI-${body.reservaId ?? 'ABONO'}`,
        reservaId: body.reservaId,
        montoEnCentavos: 4500000,
        concepto: 'Tutoría académica MyT',
      });
    }

    return jsonResponse(route, { mensaje: `Ruta mock no configurada: ${method} ${path}` }, 404);
  });

  return state;
}
