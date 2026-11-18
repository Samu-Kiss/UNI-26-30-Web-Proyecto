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
  it('permite iniciar sesión con Google y ejecutar el flujo completo de recuperación de contraseña', () => {
    const f = TestBed.createComponent(LoginPageComponent);
    f.detectChanges();
    http.expectOne('/api/sesion').flush({}, { status: 401, statusText: 'Unauthorized' });
    const c = f.componentInstance;

    c.alternarRecuperacion(true);
    c.correoRecuperacion = 'user1@myt.edu.co';
    c.solicitarCodigoRecuperacion();
    http.expectOne('/api/sesion/recuperar').flush({
      mensaje: 'Código generado',
      tokenRecuperacion: 'MYT-ABC123',
      expiraEnMinutos: 15,
    });
    expect(c.tokenGenerado()).toBe('MYT-ABC123');
    expect(c.tokenRestablecimiento).toBe('MYT-ABC123');

    c.nuevaContrasena = 'NuevaClaveSegura99!';
    c.confirmarRestablecimiento();
    http.expectOne('/api/sesion/restablecer').flush({
      mensaje: 'Contraseña actualizada correctamente.',
    });
    expect(c.modoRecuperacion()).toBe(false);
    expect(c.mensajeExito()).toContain('Contraseña actualizada');

    c.procesarLoginGoogle();
    const googleUrlReq = http.expectOne((req) => req.url === '/api/sesion/google/url');
    expect(googleUrlReq.request.params.get('redirectTo')).toContain('/login');
    googleUrlReq.flush({
      url: 'https://rrxvxcufuwmjbqiwhgmt.supabase.co/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A4200%2Flogin',
      supabaseUrl: 'https://rrxvxcufuwmjbqiwhgmt.supabase.co',
      provider: 'google',
    });
    expect(c.urlRedireccionGoogle()).toContain(
      'https://rrxvxcufuwmjbqiwhgmt.supabase.co/auth/v1/authorize?provider=google',
    );

    c.autenticarConTokenGoogle('eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImNhbWlsYUBqYXZlcmlhbmEuZWR1LmNvIn0.sig');
    const googlePostReq = http.expectOne('/api/sesion/google');
    expect(googlePostReq.request.body).toEqual({
      credencial: 'eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImNhbWlsYUBqYXZlcmlhbmEuZWR1LmNvIn0.sig',
      correo: undefined,
      nombre: undefined,
    });
    googlePostReq.flush({
      actual: { rol: 'ESTUDIANTE', perfilId: 5, nombreUsuario: 'Camila Google' },
      opciones: [],
    });
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/tutores');
    f.destroy();
  });

  it('procesa automáticamente el access_token del hash devuelto por Supabase OAuth en /login', () => {
    window.history.replaceState(
      null,
      '',
      '/login#access_token=supabase.jwt.token&token_type=bearer&expires_in=3600',
    );
    const f = TestBed.createComponent(LoginPageComponent);
    f.detectChanges();
    http.expectNone('/api/sesion');
    const googlePostReq = http.expectOne('/api/sesion/google');
    expect(googlePostReq.request.body.credencial).toBe('supabase.jwt.token');
    googlePostReq.flush({
      actual: { rol: 'ESTUDIANTE', perfilId: 9, nombreUsuario: 'Estudiante Supabase' },
      opciones: [],
    });
    expect(window.location.hash).toBe('');
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/tutores');
    f.destroy();
  });

  it('maneja error_description en OAuth callback, cuenta de prueba rápida y navegación de administrador/tutor sin horarios', () => {
    window.history.replaceState(
      null,
      '',
      '/login?error_description=Acceso%20cancelado%20por%20el%20usuario',
    );
    const f = TestBed.createComponent(LoginPageComponent);
    f.detectChanges();
    http.expectNone('/api/sesion');
    const c = f.componentInstance;
    expect(c.error()).toContain('Acceso cancelado');

    c.usarCuentaPrueba('admin@myt.edu.co');
    http.expectOne('/api/sesion/login').flush({
      actual: { rol: 'ADMINISTRADOR', perfilId: 1, nombreUsuario: 'Admin' },
      opciones: [],
    });
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/usuarios');

    c.procesarLoginGoogle('token.directo.123');
    http.expectOne('/api/sesion/google').flush({
      actual: { rol: 'TUTOR', perfilId: 4, nombreUsuario: 'Tutor Nuevo' },
      opciones: [],
    });
    http.expectOne('/api/tutores/4/agenda').flush({ horarios: [], bloqueos: [] });
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/mi-perfil?setup=1');

    c.procesarLoginGoogle('token.directo.456');
    http.expectOne('/api/sesion/google').flush({
      actual: { rol: 'TUTOR', perfilId: 5, nombreUsuario: 'Tutor Error' },
      opciones: [],
    });
    http.expectOne('/api/tutores/5/agenda').flush({}, { status: 500, statusText: 'Error' });
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/reservas');

    c.procesarLoginGoogle();
    http
      .expectOne((r) => r.url === '/api/sesion/google/url')
      .flush({ mensaje: 'Error OAuth' }, { status: 500, statusText: 'Error' });
    expect(c.error()).toBeTruthy();

    c.correoRecuperacion = 'noexiste@myt.edu.co';
    c.solicitarCodigoRecuperacion();
    http
      .expectOne('/api/sesion/recuperar')
      .flush({ mensaje: 'No encontrado' }, { status: 400, statusText: 'Bad Request' });
    expect(c.error()).toContain('No encontrado');

    c.tokenRestablecimiento = 'MYT-INVALID';
    c.nuevaContrasena = 'ClaveValida123!';
    c.confirmarRestablecimiento();
    http
      .expectOne('/api/sesion/restablecer')
      .flush({ mensaje: 'Código inválido' }, { status: 400, statusText: 'Bad Request' });
    expect(c.error()).toContain('Código inválido');
    f.destroy();
  });
});
