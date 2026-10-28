import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService, apiInterceptor } from './auth.service';
import { UsuarioService } from './usuario.service';
import { RegistroUsuario } from '../models/usuario.model';

describe('Sesión y formularios HTTP', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => http.verify());
  it('envía credenciales por HTTP con protección CSRF y restaura estado sin guardar JWT en JavaScript', () => {
    auth.iniciarSesion({ correo: 'ana@test.edu', contrasena: 'clave' }).subscribe();
    const req = http.expectOne('/api/sesion/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-MYT-Request')).toBe('1');
    req.flush({ actual: null, opciones: ['ESTUDIANTE:1', 'TUTOR:2'] });
    expect(auth.opciones()).toHaveLength(2);
    auth.elegir('TUTOR:2').subscribe();
    http
      .expectOne('/api/sesion/perfil')
      .flush({ actual: { rol: 'TUTOR', perfilId: 2 }, opciones: [] });
    expect(auth.sesion()?.rol).toBe('TUTOR');
    auth.restaurar().subscribe();
    http.expectOne('/api/sesion').flush({ actual: { rol: 'TUTOR', perfilId: 2 }, opciones: [] });
    auth.cerrar().subscribe();
    http.expectOne('/api/sesion/logout').flush(null);
    expect(auth.sesion()).toBeNull();
  });
  it('consulta por ID sin descargar todos los usuarios y registra solo campos permitidos', () => {
    const service = TestBed.inject(UsuarioService);
    service.consultarPorId(7).subscribe();
    http.expectOne('/api/usuarios/7').flush({ id: 7 });
    service
      .guardar({
        nombre: 'Ana',
        apellido: 'Pérez',
        correo: 'ana@test.edu',
        contrasena: 'Clave123!',
        rol: 'ESTUDIANTE',
        semestre: '3',
        tarifaPorHora: '',
        roles: ['ADMINISTRADOR'],
      } as RegistroUsuario)
      .subscribe();
    const req = http.expectOne('/api/usuarios');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.semestre).toBe(3);
    expect(req.request.body.roles).toBeUndefined();
    req.flush(null);
  });
});
