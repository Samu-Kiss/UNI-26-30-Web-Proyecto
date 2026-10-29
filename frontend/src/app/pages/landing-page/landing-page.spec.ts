import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiService, ReservaApi } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LandingPageComponent } from './landing-page';

describe('Próximas tutorías reales en la portada', () => {
  const reserva: ReservaApi = {
    id: 36,
    tutorId: 1,
    estudianteId: 1,
    tutor: 'Felipe',
    estudiante: 'Juan',
    materia: 'Cálculo',
    fecha: '2030-05-16',
    horaInicio: '10:00:00',
    duracionMinutos: 60,
    tema: 'Repaso',
    estado: 'PENDIENTE',
    costoTotal: 40000,
  };
  const api = {
    cambios: new Subject<void>(),
    tutores: vi.fn(() => of({ content: [] })),
    reservas: vi.fn(() => of([reserva])),
  };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-05-15T17:00:00Z'));
    api.reservas.mockReset().mockReturnValue(of([reserva]));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([]), { provide: ApiService, useValue: api }],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  function abrir(autenticado = true) {
    if (autenticado)
      TestBed.inject(AuthService).sesion.set({
        rol: 'ESTUDIANTE',
        perfilId: 1,
        nombreUsuario: 'Juan',
      });
    const f = TestBed.createComponent(LandingPageComponent);
    f.detectChanges();
    vi.advanceTimersByTime(0);
    f.detectChanges();
    return f;
  }
  it('invita al visitante a iniciar sesión sin consultar ni mostrar reservas ficticias', () => {
    const f = abrir(false);
    expect(api.reservas).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).toContain(
      'Inicia sesión para consultar tus próximas tutorías.',
    );
    expect(f.nativeElement.querySelector('a[href="/reservas/1"]')).toBeNull();
    f.destroy();
  });
  it('excluye reservas pasadas y canceladas y ordena las próximas por fecha', () => {
    api.reservas.mockReturnValue(
      of([
        { ...reserva, id: 37, fecha: '2030-05-17' },
        { ...reserva, id: 38, estado: 'CANCELADA' },
        { ...reserva, id: 39, fecha: '2030-05-14' },
        reserva,
      ]),
    );
    const f = abrir();
    expect(f.componentInstance.proximas().map((r) => r.id)).toEqual([36, 37]);
    expect(f.nativeElement.querySelector('a[href="/reservas/36"]')).not.toBeNull();
    api.reservas.mockReturnValue(of([]));
    api.cambios.next();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No tienes próximas tutorías.');
    f.destroy();
  });
  it('presenta carga y error sin reservas anteriores y permite reintentar', () => {
    const pendientes = new Subject<ReservaApi[]>();
    api.reservas.mockReturnValueOnce(pendientes);
    const f = abrir();
    expect(f.nativeElement.textContent).toContain('Cargando próximas tutorías…');
    pendientes.next([reserva]);
    pendientes.complete();
    api.reservas.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    api.cambios.next();
    f.detectChanges();
    expect(f.componentInstance.proximas()).toEqual([]);
    expect(f.nativeElement.querySelector('a[href="/reservas/36"]')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Reintentar próximas tutorías');
    f.componentInstance.cargar();
    f.detectChanges();
    vi.advanceTimersByTime(0);
    f.detectChanges();
    expect(f.componentInstance.proximas().map((r) => r.id)).toEqual([36]);
    f.destroy();
  });
});
