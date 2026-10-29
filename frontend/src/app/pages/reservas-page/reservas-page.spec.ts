import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ReservasPageComponent } from './reservas-page';
import { AuthService } from '../../core/services/auth.service';
import { ApiService, ReservaApi } from '../../core/services/api.service';
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
  estado: 'PENDIENTE',
  costoTotal: 50000,
};
describe('Reservas según disponibilidad real', () => {
  const parametros = new BehaviorSubject(convertToParamMap({ tutor: '7' }));
  const api = {
    cambios: new Subject<void>(),
    reservas: vi.fn(() => of([reserva])),
    tutor: vi.fn(() =>
      of({
        id: 7,
        nombre: 'Ana',
        materias: [{ id: 1, nombre: 'Cálculo' }],
        calificacion: null,
        tarifaPorHora: 50000,
      }),
    ),
    horas: vi.fn(),
    crearReserva: vi.fn(() => of(reserva)),
    estadoReserva: vi.fn(() => of(reserva)),
  };
  beforeEach(() => {
    vi.useFakeTimers();
    api.horas.mockReturnValue(of(['10:00', '10:30']));
    api.crearReserva.mockClear();
    api.estadoReserva.mockClear();
    api.estadoReserva.mockReturnValue(of(reserva));
    parametros.next(convertToParamMap({ tutor: '7' }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: ApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: parametros },
        },
      ],
    });
    TestBed.inject(AuthService).sesion.set({
      rol: 'ESTUDIANTE',
      perfilId: 2,
      nombreUsuario: 'Juan',
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  function abrir() {
    const f = TestBed.createComponent(ReservasPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    return f;
  }
  it('solo ofrece 60, 90 y 120 minutos y espera la disponibilidad', async () => {
    const f = abrir();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const sel = f.nativeElement.querySelector('select[name="duracion"]') as HTMLSelectElement;
    expect([...sel.options].map((o) => o.textContent?.trim())).toEqual([
      '60 minutos',
      '90 minutos',
      '120 minutos',
    ]);
    expect(f.nativeElement.querySelector('select[name="hora"]').disabled).toBe(true);
    f.componentInstance.datos.fecha = '2030-05-16';
    f.componentInstance.cargarHoras();
    expect(api.horas).toHaveBeenCalledWith(7, '2030-05-16', 60);
    f.destroy();
  });
  it('descarta respuestas obsoletas al cambiar la duración', () => {
    const f = abrir();
    const a = new Subject<string[]>();
    const b = new Subject<string[]>();
    api.horas.mockReturnValueOnce(a).mockReturnValueOnce(b);
    const c = f.componentInstance;
    c.datos.fecha = '2030-05-16';
    c.cargarHoras();
    c.datos.duracionMinutos = 120;
    c.cargarHoras();
    a.next(['17:00']);
    expect(c.horas()).toEqual([]);
    b.next(['16:00']);
    expect(c.horas()).toEqual(['16:00']);
    f.destroy();
  });
  it('guarda Otro y navega a una confirmación independiente', () => {
    const f = abrir();
    const c = f.componentInstance;
    c.datos.fecha = '2030-05-16';
    c.cargarHoras();
    c.datos.horaInicio = '10:00';
    c.datos.tema = 'Repaso';
    c.objetivoSesion = 'Otro';
    c.objetivoOtro = 'Revisar demostración';
    c.crear();
    expect(api.crearReserva).toHaveBeenCalledWith(
      expect.objectContaining({ objetivo: 'Revisar demostración' }),
    );
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/reservas', 9], {
      queryParams: { creada: '1' },
    });
    f.destroy();
  });
  it('no envía horas ajenas a las opciones ni cancela sin motivo', () => {
    const f = abrir();
    const c = f.componentInstance;
    c.datos.horaInicio = '03:00';
    c.crear();
    expect(api.crearReserva).not.toHaveBeenCalled();
    c.cancelar(reserva);
    c.motivo = ' ';
    c.cambiar(reserva, 'CANCELADA');
    expect(api.estadoReserva).not.toHaveBeenCalled();
    c.motivo = 'Conflicto de horario';
    c.cambiar(reserva, 'CANCELADA');
    expect(api.estadoReserva).toHaveBeenCalledWith(9, 'CANCELADA', 'Conflicto de horario');
    expect(c.cancelando()).toBeNull();
    f.destroy();
  });
  it('vuelve al listado al quitar tutor sin recrear el componente ni recargar', () => {
    const f = abrir();
    const c = f.componentInstance;
    c.datos.fecha = '2030-05-16';
    c.cargarHoras();
    c.objetivoOtro = 'Objetivo anterior';
    parametros.next(convertToParamMap({}));
    f.detectChanges();
    expect(f.nativeElement.querySelector('h1').textContent).toBe('Mis reservas');
    expect(f.nativeElement.querySelector('form')).toBeNull();
    expect(c.horas()).toEqual([]);
    expect(c.datos.tutorId).toBe(0);
    expect(c.objetivoOtro).toBe('');
    expect(f.nativeElement.textContent).toContain('Repaso');
    parametros.next(convertToParamMap({ tutor: '7' }));
    f.detectChanges();
    expect(f.nativeElement.querySelector('h1').textContent).toBe('Crear reserva');
    f.destroy();
  });
  it('descarta la respuesta del tutor si se vuelve al listado durante la carga', () => {
    const pendiente = new Subject<
      ReturnType<typeof api.tutor> extends import('rxjs').Observable<infer T> ? T : never
    >();
    api.tutor.mockReturnValueOnce(pendiente);
    const f = abrir();
    parametros.next(convertToParamMap({}));
    pendiente.next({
      id: 7,
      nombre: 'Ana',
      materias: [],
      calificacion: null,
      tarifaPorHora: 50000,
    });
    expect(f.componentInstance.tutor()).toBeNull();
    f.destroy();
  });
  it('permite volver sin cancelar y conserva el motivo cuando el servidor rechaza la operación', () => {
    const f = abrir();
    const c = f.componentInstance;
    c.cancelar(reserva);
    c.volverSinCancelar();
    expect(api.estadoReserva).not.toHaveBeenCalled();
    expect(c.cancelando()).toBeNull();
    c.cancelar(reserva);
    c.motivo = 'x'.repeat(501);
    c.cambiar(reserva, 'CANCELADA');
    expect(api.estadoReserva).not.toHaveBeenCalled();
    api.estadoReserva.mockReturnValueOnce(throwError(() => new Error('Sin conexión')));
    c.motivo = 'Conflicto de horario';
    c.cambiar(reserva, 'CANCELADA');
    expect(c.cancelando()?.id).toBe(9);
    expect(c.motivo).toBe('Conflicto de horario');
    expect(c.guardando()).toBe(false);
    f.destroy();
  });
});
