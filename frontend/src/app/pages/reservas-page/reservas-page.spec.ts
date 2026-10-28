import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ReservasPageComponent } from './reservas-page';
import { AuthService } from '../../core/services/auth.service';
import { ReservaApi } from '../../core/services/api.service';
const reserva: ReservaApi = { id: 9, tutorId: 7, estudianteId: 2, tutor: 'Ana', estudiante: 'Juan',
 materia: 'Cálculo', fecha: '2026-11-16', horaInicio: '10:00', duracionMinutos: 60,
 tema: 'Repaso', estado: 'PENDIENTE', costoTotal: 50000 };
describe('Reservas conectadas', () => {
 let http: HttpTestingController;
 beforeEach(() => {
  TestBed.configureTestingModule({ imports: [ReservasPageComponent], providers: [provideRouter([]),
   provideHttpClient(), provideHttpClientTesting(), { provide: ActivatedRoute, useValue: {
    snapshot: { queryParamMap: convertToParamMap({ tutor: '7' }) } } }] });
  http = TestBed.inject(HttpTestingController);
  TestBed.inject(AuthService).sesion.set({ rol: 'ESTUDIANTE', perfilId: 2, nombreUsuario: 'Juan' });
 });
 afterEach(() => { http.verify(); vi.restoreAllMocks(); });
 function abrir() {
  const f=TestBed.createComponent(ReservasPageComponent); f.detectChanges();
  http.expectOne('/api/tutores/7').flush({ id: 7, nombre: 'Ana', disponible: true, tarifaPorHora: 50000,
    materias: [{ id: 1, nombre: 'Cálculo' }] });
  http.expectOne('/api/reservas').flush([reserva]); return f;
 }
 it('crea una reserva, evita duplicados y conserva datos tras error de red para reintentar', () => {
  const f=abrir(); const c=f.componentInstance;
  c.datos={ ...c.datos, fecha: '2026-11-16', horaInicio: '10:00', tema: 'Repaso' };
  c.crear(); c.crear();
  const req=http.expectOne('/api/reservas'); expect(req.request.method).toBe('POST');
  expect(c.guardando()).toBe(true); req.error(new ProgressEvent('error'));
  expect(c.guardando()).toBe(false); expect(c.datos.tema).toBe('Repaso'); expect(c.error()).toContain('No hay conexión');
  c.crear(); http.expectOne('/api/reservas').flush(reserva); http.expectOne('/api/reservas').flush([reserva]);
  expect(c.mensaje()).toBe('Reserva creada.'); expect(c.datos.tema).toBe(''); f.destroy();
 });
 it('envía PUT con motivo, exige confirmación para DELETE y permite filtrar/reintentar consultas', () => {
  const f=abrir(); const c=f.componentInstance;
  vi.spyOn(window,'confirm').mockReturnValue(false); c.cancelar(reserva); http.expectNone('/api/reservas/9');
  vi.mocked(window.confirm).mockReturnValue(true);
  c.cambiar(reserva,'CANCELADA'); http.expectNone('/api/reservas/9/estado');
  c.motivo='Conflicto de horario'; c.cambiar(reserva,'CANCELADA');
  const put=http.expectOne('/api/reservas/9/estado'); expect(put.request.method).toBe('PUT');
  expect(put.request.body.motivo).toBe('Conflicto de horario'); put.flush({ ...reserva, estado: 'CANCELADA' });
  http.expectOne('/api/reservas').flush([{ ...reserva, estado: 'CANCELADA' }]);
  c.cancelar(reserva); const del=http.expectOne('/api/reservas/9'); expect(del.request.method).toBe('DELETE');
  del.flush(null); http.expectOne('/api/reservas').flush([]);
  c.estado='CONFIRMADA'; c.cargar();
  http.expectOne('/api/reservas?estado=CONFIRMADA').flush({}, { status:403,statusText:'Forbidden' });
  expect(c.error()).toContain('no tiene permiso'); expect(c.cargando()).toBe(false);
  c.cargar(); http.expectOne('/api/reservas?estado=CONFIRMADA').flush([]); expect(c.error()).toBe(''); f.destroy();
 });
 it('conserva listado y muestra expiración o conflicto sin bloquear futuras acciones', () => {
  const f=abrir(); const c=f.componentInstance;
  c.cambiar(reserva,'CONFIRMADA');
  http.expectOne('/api/reservas/9/estado').flush({ mensaje:'Estado obsoleto' }, {status:409,statusText:'Conflict'});
  expect(c.error()).toBe('Estado obsoleto'); expect(c.reservas()).toHaveLength(1);
  c.cargar(); http.expectOne('/api/reservas').flush({}, {status:401,statusText:'Unauthorized'});
  expect(c.error()).toContain('sesión expiró'); expect(c.reservas()).toHaveLength(1); f.destroy();
 });
});
