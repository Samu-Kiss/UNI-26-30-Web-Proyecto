import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { AuthService, Sesion, sessionGuard } from './auth.service';

describe('Protección de rutas y restauración de sesión', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => http.verify());

  function proteger(admin: boolean) {
    const route = new ActivatedRouteSnapshot();
    route.data = { admin };
    return TestBed.runInInjectionContext(() => sessionGuard(route, {} as RouterStateSnapshot));
  }

  it.each([
    ['ADMINISTRADOR', true, true],
    ['TUTOR', true, '/tutores'],
    ['ESTUDIANTE', true, '/tutores'],
    ['TUTOR', false, true],
    ['ESTUDIANTE', false, true],
  ] as const)(
    'valida el rol %s con admin=%s sin volver a consultar la sesión',
    (rol, admin, esperado) => {
      auth.sesion.set({ rol, perfilId: 1, nombreUsuario: 'Ana' });
      const resultado = proteger(admin);
      expect(resultado instanceof UrlTree ? resultado.toString() : resultado).toBe(esperado);
      http.expectNone('/api/sesion');
    },
  );

  it.each([
    ['ADMINISTRADOR', true, true],
    ['TUTOR', true, '/tutores'],
    ['ESTUDIANTE', false, true],
    [null, false, '/login'],
  ] as const)('restaura el perfil %s antes de decidir el acceso', async (rol, admin, esperado) => {
    const resultado = proteger(admin);
    if (!isObservable(resultado)) throw new Error('Se esperaba restauración HTTP');
    const pendiente = firstValueFrom(resultado);
    const actual: Sesion | null = rol ? { rol, perfilId: 2, nombreUsuario: 'Ana' } : null;
    http.expectOne('/api/sesion').flush({ actual, opciones: [] });
    const decision = await pendiente;
    expect(decision instanceof UrlTree ? decision.toString() : decision).toBe(esperado);
    expect(auth.sesion()).toEqual(actual);
  });

  it('redirige a login y elimina opciones anteriores cuando la sesión caduca', async () => {
    auth.opciones.set(['TUTOR:2']);
    const resultado = proteger(true);
    if (!isObservable(resultado)) throw new Error('Se esperaba restauración HTTP');
    const pendiente = firstValueFrom(resultado);
    http.expectOne('/api/sesion').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect((await pendiente).toString()).toBe('/login');
    expect(auth.sesion()).toBeNull();
    expect(auth.opciones()).toEqual([]);
  });
});
