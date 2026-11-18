import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { routes } from '../app.routes';
import { ApiService, MensajeApi, ResenaApi, ReservaApi, mensajeHttp } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { AgendaEditorComponent } from '../shared/components/organisms/agenda-editor/agenda-editor';
import { CalendarioPageComponent } from './calendario-page/calendario-page';
import { EstudiantesPageComponent } from './estudiantes-page/estudiantes-page';
import { MensajesPageComponent } from './mensajes-page/mensajes-page';
import { MenuRolPageComponent } from './menu-rol-page/menu-rol-page';
import { PerfilPageComponent } from './perfil-page/perfil-page';
import { ResenasPageComponent } from './resenas-page/resenas-page';
import { ReservaDetallePageComponent } from './reserva-detalle-page/reserva-detalle-page';
const reserva: ReservaApi = {
  id: 9,
  tutorId: 7,
  estudianteId: 2,
  tutor: 'Ana',
  estudiante: 'Juan',
  materia: 'Cálculo',
  fecha: '2030-05-16',
  horaInicio: '10:00',
  duracionMinutos: 60,
  tema: 'Repaso',
  estado: 'COMPLETADA',
  costoTotal: 50000,
};
describe('Vistas con datos reales', () => {
  const api = {
    cambios: new Subject<void>(),
    reservas: vi.fn(() => of([reserva])),
    resenas: vi.fn(() => of([] as ResenaApi[])),
    crearResena: vi.fn(() => of({} as ResenaApi)),
    reserva: vi.fn(() => of(reserva)),
    mensajes: vi.fn(() =>
      of([
        { id: 1, autor: 'Juan', contenido: 'Hola Ana', fecha: '2030-05-15T10:00:00' },
        { id: 2, autor: 'Ana', contenido: 'Hola Juan', fecha: '2030-05-15T10:05:00' },
      ] as MensajeApi[]),
    ),
    enviarMensaje: vi.fn(() =>
      of({ id: 3, autor: 'Juan', contenido: 'Nos vemos', fecha: '2030-05-15T10:10:00' }),
    ),
    agenda: vi.fn(() =>
      of({
        horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '12:00' }],
        bloqueos: [{ fecha: '2030-05-16', horaInicio: '14:00', horaFin: '16:00', motivo: 'Cita' }],
      }),
    ),
    guardarAgenda: vi.fn((_id: number, a: unknown) => of(a)),
    estudiantes: vi.fn(() =>
      of([
        {
          id: 1,
          usuarioId: 10,
          nombreCompleto: 'Laura Gómez',
          correo: 'laura@test.edu',
          codigoEstudiantil: '202601',
          universidad: 'Javeriana',
          programaAcademico: 'Sistemas',
          semestre: 5,
          activo: true,
        },
        {
          id: 2,
          usuarioId: 11,
          nombreCompleto: 'Pedro Díaz',
          correo: 'pedro@test.edu',
          codigoEstudiantil: '',
          universidad: '',
          programaAcademico: '',
          semestre: 0,
          activo: false,
        },
      ]),
    ),
  };
  beforeEach(() => {
    vi.useFakeTimers();
    api.reservas.mockReturnValue(of([reserva]));
    api.resenas.mockReturnValue(of([]));
    api.crearResena.mockReturnValue(of({} as ResenaApi));
    api.reserva.mockReturnValue(of(reserva));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {},
              paramMap: convertToParamMap({ id: '9' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    });
    TestBed.inject(AuthService).sesion.set({
      rol: 'ESTUDIANTE',
      perfilId: 2,
      nombreUsuario: 'Juan',
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  it('actualiza los eventos al cambiar de mes, muestra bloqueos de tutor y maneja errores', () => {
    TestBed.inject(AuthService).sesion.set({ rol: 'TUTOR', perfilId: 7, nombreUsuario: 'Ana' });
    const f = TestBed.createComponent(CalendarioPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    const c = f.componentInstance;
    c.mes.set(new Date(2030, 4, 1));
    f.detectChanges();
    expect(c.eventos().map((r) => r.id)).toEqual([9]);
    expect(c.bloqueosMes()).toHaveLength(1);
    expect(f.nativeElement.textContent).toContain('Disponibilidad semanal');
    c.cambiarMes(1);
    expect(c.eventos()).toEqual([]);
    api.reservas.mockReturnValueOnce(throwError(() => new Error('fallo')));
    c.cargar();
    expect(c.error()).toBeTruthy();
    api.reservas.mockReturnValue(of([]));
    api.cambios.next();
    expect(c.reservas()).toEqual([]);
    f.destroy();
  });
  it('ofrece añadir reseña solo a tutorías completadas, permite publicar y maneja error', () => {
    api.reservas.mockReturnValue(of([reserva, { ...reserva, id: 10, estado: 'CONFIRMADA' }]));
    const f = TestBed.createComponent(ResenasPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.pendientes().map((r) => r.id)).toEqual([9]);
    expect(f.nativeElement.textContent).toContain('Añadir reseña');
    c.seleccionar(reserva);
    f.detectChanges();
    expect(c.seleccionada()?.id).toBe(9);
    c.calificacion = 4;
    c.comentario = 'Excelente explicación';
    c.publicar();
    expect(api.crearResena).toHaveBeenCalledWith({
      reservaId: 9,
      calificacion: 4,
      comentario: 'Excelente explicación',
    });
    expect(c.mensaje()).toBe('Reseña publicada.');

    c.seleccionar(reserva);
    api.crearResena.mockReturnValueOnce(throwError(() => new Error('fallo')));
    c.publicar();
    expect(c.error()).toBeTruthy();

    api.reservas.mockReturnValueOnce(throwError(() => new Error('fallo')));
    c.cargar();
    f.detectChanges();
    expect(c.error()).toBeTruthy();

    api.reservas.mockReturnValueOnce(of([]));
    c.cargar();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('¡Al día con tus valoraciones!');
    f.destroy();
  });
  it('el tutor ve sus reseñas recibidas, calcula el promedio y no ve formulario', () => {
    TestBed.inject(AuthService).sesion.set({ rol: 'TUTOR', perfilId: 7, nombreUsuario: 'Ana' });
    api.resenas.mockReturnValue(
      of([
        {
          id: 1,
          reservaId: 9,
          tutorId: 7,
          tutor: 'Ana',
          estudiante: 'Juan',
          calificacion: 5,
          comentario: 'Muy clara',
          fecha: '2030-05-16',
        },
      ]),
    );
    const f = TestBed.createComponent(ResenasPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    f.detectChanges();
    expect(f.nativeElement.querySelector('form')).toBeNull();
    expect(f.componentInstance.promedio()).toBe(5);
    expect(f.nativeElement.textContent).toContain('Muy clara');

    api.resenas.mockReturnValueOnce(of([]));
    f.componentInstance.cargar();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Aún no tienes reseñas.');
    f.destroy();
  });
  it('el detalle muestra datos según rol, confirmación recién creada y maneja error', () => {
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot as { queryParamMap: unknown }).queryParamMap = convertToParamMap({
      creada: '1',
    });
    api.reserva.mockReturnValue(
      of({
        ...reserva,
        estado: 'PENDIENTE',
        modalidad: 'PRESENCIAL',
        motivoCancelacion: 'Reprogramada',
        estudianteCorreo: 'juan@test.edu',
        estudianteTelefono: '3001234567',
      }),
    );
    const f = TestBed.createComponent(ReservaDetallePageComponent);
    f.detectChanges();
    expect(api.reserva).toHaveBeenCalledWith(9);
    expect(f.nativeElement.textContent).toContain('¡Solicitud enviada!');
    expect(f.nativeElement.textContent).toContain('Presencial');
    expect(f.nativeElement.textContent).toContain('Reprogramada');

    TestBed.inject(AuthService).sesion.set({ rol: 'TUTOR', perfilId: 7, nombreUsuario: 'Ana' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('juan@test.edu');

    api.reserva.mockReturnValueOnce(throwError(() => new Error('fallo')));
    f.componentInstance.cargar();
    f.detectChanges();
    expect(f.componentInstance.error()).toBeTruthy();
    f.destroy();
  });
  it('edita y guarda horarios y bloqueos en AgendaEditorComponent', () => {
    const f = TestBed.createComponent(AgendaEditorComponent);
    f.componentRef.setInput('tutorId', 7);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.lista()).toBe(true);
    c.agregarHorario();
    c.agregarBloqueo();
    f.detectChanges();
    expect(c.agenda.horarios.length).toBe(2);
    expect(c.agenda.bloqueos.length).toBe(2);
    c.guardar();
    expect(c.mensaje()).toBe('Agenda guardada.');

    api.guardarAgenda.mockReturnValueOnce(throwError(() => new Error('fallo')));
    c.guardar();
    f.detectChanges();
    expect(c.error()).toBeTruthy();

    api.agenda.mockReturnValueOnce(of({ horarios: [], bloqueos: [] }));
    c.cargar();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No has configurado disponibilidad.');
    expect(f.nativeElement.textContent).toContain('No tienes bloqueos registrados.');

    api.agenda.mockReturnValueOnce(throwError(() => new Error('fallo')));
    c.cargar();
    f.detectChanges();
    expect(c.error()).toBeTruthy();
    f.destroy();
  });
  it('renderiza y filtra el directorio de estudiantes y maneja errores', () => {
    const f = TestBed.createComponent(EstudiantesPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.totalActivos()).toBe(1);
    expect(c.totalInactivos()).toBe(1);
    c.filtro.set('laura');
    f.detectChanges();
    expect(c.estudiantesFiltrados()).toHaveLength(1);
    c.filtro.set('inexistente');
    f.detectChanges();
    expect(c.estudiantesFiltrados()).toHaveLength(0);

    api.estudiantes.mockReturnValueOnce(throwError(() => new Error('fallo')));
    c.cargarEstudiantes();
    f.detectChanges();
    expect(c.error()).toBeTruthy();
    f.destroy();
  });
  it('permite cambiar entre los paneles de MenuRolPageComponent', () => {
    const f = TestBed.createComponent(MenuRolPageComponent);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.etiquetaPanel()).toBe('Panel de estudiante');
    c.rolVista.set('TUTOR');
    f.detectChanges();
    expect(c.etiquetaPanel()).toBe('Panel de tutor');
    c.rolVista.set('ADMINISTRADOR');
    f.detectChanges();
    expect(c.etiquetaPanel()).toBe('Panel administrativo');
    f.destroy();
  });
  it('carga y actualiza los datos de PerfilPageComponent y resuelve los lazy routes', async () => {
    const httpMock = TestBed.inject(HttpTestingController);
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot as { queryParamMap: unknown }).queryParamMap = convertToParamMap({
      setup: '1',
    });
    const f = TestBed.createComponent(PerfilPageComponent);
    f.detectChanges();
    httpMock.expectOne('/api/perfil').flush({
      id: 2,
      nombre: 'Juan',
      apellido: 'Pérez',
      correo: 'juan@test.edu',
      telefono: '3001234567',
      activo: true,
      roles: ['ESTUDIANTE'],
    });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('¡Te damos la bienvenida a MyT!');
    const c = f.componentInstance;
    c.usuario()!.nombre = 'Juan Carlos';
    c.guardar();
    httpMock.expectOne('/api/perfil').flush({
      id: 2,
      nombre: 'Juan Carlos',
      apellido: 'Pérez',
      correo: 'juan@test.edu',
      telefono: '3001234567',
      activo: true,
      roles: ['ESTUDIANTE'],
    });
    f.detectChanges();
    expect(c.mensaje()).toBe('Perfil actualizado.');
    expect(TestBed.inject(AuthService).sesion()?.nombreUsuario).toBe('Juan Carlos Pérez');

    TestBed.inject(AuthService).sesion.set({ rol: 'TUTOR', perfilId: 7, nombreUsuario: 'Ana' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('app-agenda-editor')).not.toBeNull();

    c.guardar();
    httpMock.expectOne('/api/perfil').flush({}, { status: 500, statusText: 'Error' });
    f.detectChanges();
    expect(c.error()).toBeTruthy();

    c.cargar();
    httpMock.expectOne('/api/perfil').flush({}, { status: 500, statusText: 'Error' });
    f.detectChanges();
    expect(c.error()).toBeTruthy();
    f.destroy();

    for (const routeItem of routes) {
      if (routeItem.loadComponent) {
        const comp = await routeItem.loadComponent();
        expect(comp).toBeDefined();
      }
    }
  });
  it('envía mensajes, muestra burbujas en MensajesPageComponent y maneja errores', () => {
    const f = TestBed.createComponent(MensajesPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    f.detectChanges();
    const c = f.componentInstance;
    c.seleccionar(9);
    vi.advanceTimersByTime(0);
    f.detectChanges();
    expect(c.mensajes()).toHaveLength(2);
    expect(f.nativeElement.textContent).toContain('Hola Ana');
    c.texto = 'Nos vemos';
    c.enviar();
    f.detectChanges();
    expect(c.mensajes()).toHaveLength(3);
    expect(c.texto).toBe('');

    c.texto = 'Fallo';
    api.enviarMensaje.mockReturnValueOnce(throwError(() => new Error('fallo')));
    c.enviar();
    expect(c.error()).toBeTruthy();

    api.mensajes.mockReturnValueOnce(throwError(() => new Error('fallo')));
    c.seleccionar(0);
    c.seleccionar(9);
    vi.advanceTimersByTime(0);
    expect(c.error()).toBeTruthy();

    api.reservas.mockReturnValueOnce(throwError(() => new Error('fallo')));
    c.cargar();
    f.detectChanges();
    expect(c.error()).toBeTruthy();

    api.reservas.mockReturnValueOnce(of([]));
    c.cargar();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain(
      'No tienes reservas con conversaciones disponibles.',
    );
    f.destroy();
  });
  it('cubre todos los endpoints HTTP de ApiService y los códigos de mensajeHttp', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const realApi = TestBed.inject(ApiService);
    const httpMock = TestBed.inject(HttpTestingController);

    realApi.agenda(1).subscribe();
    httpMock.expectOne('/api/tutores/1/agenda').flush({ horarios: [], bloqueos: [] });

    realApi.guardarAgenda(1, { horarios: [], bloqueos: [] }).subscribe();
    httpMock.expectOne('/api/tutores/1/agenda').flush({ horarios: [], bloqueos: [] });

    realApi.horas(1, '2030-05-16', 60).subscribe();
    httpMock.expectOne((r) => r.url === '/api/tutores/1/agenda/horas').flush(['10:00']);

    realApi.resenas(1).subscribe();
    httpMock.expectOne((r) => r.url === '/api/resenas').flush([]);

    realApi.resenas().subscribe();
    httpMock.expectOne('/api/resenas').flush([]);

    realApi.crearResena({ reservaId: 1, calificacion: 5, comentario: 'Ok' }).subscribe();
    httpMock.expectOne('/api/resenas').flush({});

    realApi.mensajes(1).subscribe();
    httpMock.expectOne('/api/chat/1').flush([]);

    realApi.enviarMensaje(1, 'Hola').subscribe();
    httpMock.expectOne('/api/chat/1').flush({});

    realApi.tutores(0, '2', '50000', 'calculo', 'precio').subscribe();
    httpMock
      .expectOne((r) => r.url === '/api/tutores')
      .flush({
        content: [
          {
            id: 7,
            usuarioId: 3,
            nombre: 'Ana',
            biografia: '',
            tarifaPorHora: 40000,
            disponible: true,
            materias: [],
            calificacion: 5,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
      });
    expect(realApi.tutorEnCache(7)?.nombre).toBe('Ana');

    realApi.tutor(7).subscribe();
    httpMock.expectOne('/api/tutores/7').flush({ id: 7, nombre: 'Ana' });

    realApi.materias().subscribe();
    httpMock.expectOne('/api/tutores/materias').flush([]);

    realApi
      .crearTutor({ usuarioId: 1, biografia: 'Bio', tarifaPorHora: 40000, materiaIds: [1] })
      .subscribe();
    httpMock.expectOne('/api/tutores').flush({});

    realApi.editarTutor(7, { biografia: 'Bio', tarifaPorHora: 45000, disponible: true }).subscribe();
    httpMock.expectOne('/api/tutores/7').flush({});

    realApi.desactivarTutor(7).subscribe();
    httpMock.expectOne('/api/tutores/7').flush(null);

    realApi.reserva(9).subscribe();
    httpMock.expectOne('/api/reservas/9').flush({});

    realApi.reservas('PENDIENTE').subscribe();
    httpMock.expectOne((r) => r.url === '/api/reservas').flush([]);

    realApi
      .crearReserva({
        tutorId: 7,
        materiaId: 1,
        fecha: '2030-05-16',
        horaInicio: '10:00',
        duracionMinutos: 60,
        tema: 'Tema',
        modalidad: 'VIRTUAL',
      })
      .subscribe();
    httpMock.expectOne('/api/reservas').flush({});

    realApi.estadoReserva(9, 'CONFIRMADA', '').subscribe();
    httpMock.expectOne('/api/reservas/9/estado').flush({});

    realApi.cancelarReserva(9, 'Motivo').subscribe();
    httpMock.expectOne((r) => r.url === '/api/reservas/9').flush(null);

    realApi.estudiantes().subscribe();
    httpMock.expectOne('/api/estudiantes').flush([]);

    realApi.estudiante(1).subscribe();
    httpMock.expectOne('/api/estudiantes/1').flush({});

    realApi.estadisticasPublicas().subscribe();
    httpMock.expectOne('/api/public/estadisticas').flush({});

    expect(mensajeHttp(new HttpErrorResponse({ status: 401 }))).toContain('sesión expiró');
    expect(mensajeHttp(new HttpErrorResponse({ status: 403 }))).toContain('no tiene permiso');
    expect(mensajeHttp(new HttpErrorResponse({ status: 409 }))).toContain('Conflicto');
    expect(mensajeHttp(new HttpErrorResponse({ status: 400 }))).toContain('Revisa los datos');
    httpMock.verify();
  });
});
