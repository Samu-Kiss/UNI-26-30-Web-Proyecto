import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { ApiService, ReservaApi } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { CalendarioPageComponent } from './calendario-page/calendario-page';
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
    resenas: vi.fn(() => of([])),
    reserva: vi.fn(() => of(reserva)),
  };
  beforeEach(() => {
    vi.useFakeTimers();
    api.reservas.mockReturnValue(of([reserva]));
    api.resenas.mockReturnValue(of([]));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: ApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
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
  it('actualiza los eventos al cambiar de mes y recibir cambios de reservas', () => {
    const f = TestBed.createComponent(CalendarioPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    const c = f.componentInstance;
    c.mes.set(new Date(2030, 4, 1));
    expect(c.eventos().map((r) => r.id)).toEqual([9]);
    c.cambiarMes(1);
    expect(c.eventos()).toEqual([]);
    api.reservas.mockReturnValue(of([]));
    api.cambios.next();
    expect(c.reservas()).toEqual([]);
    f.destroy();
  });
  it('ofrece añadir reseña solo a tutorías completadas', () => {
    api.reservas.mockReturnValue(of([reserva, { ...reserva, id: 10, estado: 'CONFIRMADA' }]));
    const f = TestBed.createComponent(ResenasPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    f.detectChanges();
    expect(f.componentInstance.pendientes().map((r) => r.id)).toEqual([9]);
    expect(f.nativeElement.textContent).toContain('Añadir reseña');
    expect(f.nativeElement.textContent).not.toContain('Reseñas publicadas recientemente');
    f.destroy();
  });
  it('el tutor no puede publicar reseñas ni ve una puntuación ficticia', () => {
    TestBed.inject(AuthService).sesion.set({ rol: 'TUTOR', perfilId: 7, nombreUsuario: 'Ana' });
    const f = TestBed.createComponent(ResenasPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    f.detectChanges();
    expect(f.nativeElement.querySelector('form')).toBeNull();
    expect(f.componentInstance.promedio()).toBeNull();
    f.destroy();
  });
  it('el detalle y la confirmación no muestran el formulario de creación', () => {
    const f = TestBed.createComponent(ReservaDetallePageComponent);
    f.detectChanges();
    expect(api.reserva).toHaveBeenCalledWith(9);
    expect(f.nativeElement.textContent).toContain('Repaso');
    expect(f.nativeElement.querySelector('form')).toBeNull();
    f.destroy();
  });
});
