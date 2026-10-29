import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { LoginPageComponent } from './login-page';
import { AuthService } from '../../core/services/auth.service';
describe('Login y elección de perfil', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  it('bloquea envíos mientras restaura y muestra credenciales inválidas, permitiendo reintento', () => {
    const f = TestBed.createComponent(LoginPageComponent);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.cargando()).toBe(true);
    c.procesarLogin({ correo: 'ana@test.edu', contrasena: 'mal' });
    http.expectNone('/api/sesion/login');
    http.expectOne('/api/sesion').flush({}, { status: 401, statusText: 'Unauthorized' });
    c.procesarLogin({ correo: 'ana@test.edu', contrasena: 'mal' });
    c.procesarLogin({ correo: 'ana@test.edu', contrasena: 'mal' });
    http
      .expectOne('/api/sesion/login')
      .flush(
        { mensaje: 'Correo o contraseña incorrectos' },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(c.error()).toContain('contraseña incorrectos');
    expect(c.cargando()).toBe(false);
    c.procesarLogin({ correo: 'ana@test.edu', contrasena: 'correcta' });
    http
      .expectOne('/api/sesion/login')
      .flush({ actual: null, opciones: ['ESTUDIANTE:1', 'TUTOR:2'] });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Elige tu perfil');
    c.elegir('TUTOR:2');
    c.elegir('TUTOR:2');
    http
      .expectOne('/api/sesion/perfil')
      .flush({ actual: { rol: 'TUTOR', perfilId: 2, nombreUsuario: 'Ana' }, opciones: [] });
    expect(TestBed.inject(AuthService).sesion()?.rol).toBe('TUTOR');
    http.expectOne('/api/tutores/2/agenda').flush({
      horarios: [{ diaSemana: 'LUNES', horaInicio: '09:00', horaFin: '18:00' }],
      bloqueos: [],
    });
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/reservas');
    f.destroy();
  });
  it('restaura opciones después de recargar y conserva la elección tras un error de red', () => {
    const f = TestBed.createComponent(LoginPageComponent);
    f.detectChanges();
    http.expectOne('/api/sesion').flush({ actual: null, opciones: ['ESTUDIANTE:1', 'TUTOR:2'] });
    f.componentInstance.elegir('TUTOR:2');
    http.expectOne('/api/sesion/perfil').error(new ProgressEvent('error'));
    expect(f.componentInstance.cargando()).toBe(false);
    expect(f.componentInstance.error()).toContain('No hay conexión');
    expect(TestBed.inject(AuthService).opciones()).toHaveLength(2);
    f.destroy();
  });
  it('recupera una sesión existente al abrir la página de login', () => {
    const f = TestBed.createComponent(LoginPageComponent);
    f.detectChanges();
    http
      .expectOne('/api/sesion')
      .flush({ actual: { rol: 'ESTUDIANTE', perfilId: 1 }, opciones: [] });
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/tutores');
    f.destroy();
  });
});
