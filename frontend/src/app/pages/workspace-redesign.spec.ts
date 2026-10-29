import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { ApiService, MensajeApi, ReservaApi } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { CalendarioPageComponent } from './calendario-page/calendario-page';
import { MensajesPageComponent } from './mensajes-page/mensajes-page';
import { TutorPerfilPageComponent } from './tutor-perfil-page/tutor-perfil-page';

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
  tema: 'Repaso de integrales',
  estado: 'CONFIRMADA',
  costoTotal: 50000,
};

describe('Interacciones de las vistas basadas en mockups', () => {
  let api: {
    cambios: Subject<void>;
    reservas: ReturnType<typeof vi.fn>;
    mensajes: ReturnType<typeof vi.fn>;
    tutor: ReturnType<typeof vi.fn>;
    resenas: ReturnType<typeof vi.fn>;
    horas: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-05-15T17:00:00Z'));
    api = {
      cambios: new Subject<void>(),
      reservas: vi.fn(() =>
        of([
          reserva,
          { ...reserva, id: 10, tutor: 'Elena', materia: 'Física', estado: 'PENDIENTE' },
        ]),
      ),
      mensajes: vi.fn(() => of([] as MensajeApi[])),
      tutor: vi.fn(() =>
        of({
          id: 7,
          nombre: 'Ana',
          materias: [{ id: 1, nombre: 'Cálculo' }],
          calificacion: null,
          tarifaPorHora: 50000,
          disponible: true,
          biografia: 'Apoyo académico',
        }),
      ),
      resenas: vi.fn(() => of([])),
      horas: vi.fn(() => of(['10:00'])),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: ApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '7' }),
              queryParamMap: convertToParamMap({ reserva: '9' }),
            },
          },
        },
      ],
    });
    TestBed.inject(AuthService).sesion.set({
      rol: 'ESTUDIANTE',
      perfilId: 2,
      nombreUsuario: 'Juan Pérez',
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('filtra conversaciones y descarta la respuesta del chat anterior al cambiar de tutoría', () => {
    const anterior = new Subject<MensajeApi[]>();
    api.mensajes.mockReturnValueOnce(anterior);
    const f = TestBed.createComponent(MensajesPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    const c = f.componentInstance;
    c.busqueda.set('elena');
    expect(c.conversaciones().map((r) => r.id)).toEqual([10]);
    c.texto = 'Borrador para Ana';
    c.seleccionar(10);
    vi.advanceTimersByTime(0);
    anterior.next([
      { id: 1, autor: 'Ana', contenido: 'Mensaje anterior', fecha: '2030-05-15T10:00:00' },
    ]);
    expect(c.texto).toBe('');
    expect(c.mensajes()).toEqual([]);
    expect(c.reservaSeleccionada()?.tutor).toBe('Elena');
    c.seleccionar(0);
    vi.advanceTimersByTime(10000);
    expect(c.seleccionada()).toBe(0);
    f.destroy();
  });

  it('resalta los mensajes propios con el nombre corto que devuelve el servidor', () => {
    const f = TestBed.createComponent(MensajesPageComponent);
    expect(
      f.componentInstance.esPropio({ id: 1, autor: 'Juan', contenido: 'Hola', fecha: '' }),
    ).toBe(true);
    expect(
      f.componentInstance.esPropio({ id: 2, autor: 'Ana', contenido: 'Hola', fecha: '' }),
    ).toBe(false);
    f.destroy();
  });

  it('mantiene los indicadores reales y vuelve al mes actual con Hoy', () => {
    api.reservas.mockReturnValue(
      of([
        reserva,
        { ...reserva, id: 10, estado: 'PENDIENTE' },
        { ...reserva, id: 11, estado: 'COMPLETADA', fecha: '2030-05-10' },
        { ...reserva, id: 12, estado: 'CANCELADA' },
      ]),
    );
    const f = TestBed.createComponent(CalendarioPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    const c = f.componentInstance;
    expect(c.totalProximas()).toBe(2);
    expect(c.pendientes()).toBe(1);
    expect(c.completadas()).toBe(1);
    expect(c.diasMes().length % 7).toBe(0);
    c.cambiarMes(1);
    expect(c.eventos()).toEqual([]);
    c.irHoy();
    expect(c.mes().getMonth()).toBe(4);
    f.destroy();
  });

  it('el perfil muestra horarios reales y descarta una fecha que terminó de cargar tarde', async () => {
    const f = TestBed.createComponent(TutorPerfilPageComponent);
    f.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.horarios()).toEqual(['10:00']);
    expect(f.nativeElement.querySelector('.profile-slots button').textContent).toContain('10:00');
    const anterior = new Subject<string[]>();
    api.horas.mockReturnValueOnce(anterior).mockReturnValueOnce(of(['14:00']));
    const primera = c.seleccionarFecha('2030-05-16');
    await c.seleccionarFecha('2030-05-17');
    anterior.next(['08:00']);
    anterior.complete();
    await primera;
    expect(c.fechaSeleccionada()).toBe('2030-05-17');
    expect(c.horarios()).toEqual(['14:00']);
    f.destroy();
  });
});
