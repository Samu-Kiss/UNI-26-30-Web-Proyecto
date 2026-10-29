import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { RegistroUsuario, Usuario } from '../../core/models/usuario.model';
import { UsuarioService } from '../../core/services/usuario.service';
import { UsuariosPageComponent } from './usuarios-page';

const usuariosMock: Usuario[] = [
  {
    id: 1,
    nombre: 'Pedro',
    apellido: 'Gómez',
    correo: 'pedro@example.com',
    telefono: '3001112233',
    activo: true,
    roles: ['ESTUDIANTE'],
  },
  {
    id: 2,
    nombre: 'Juan',
    apellido: 'Pérez',
    correo: 'juan@example.com',
    telefono: '3002223344',
    activo: true,
    roles: ['TUTOR'],
  },
  {
    id: 3,
    nombre: 'Ana',
    apellido: 'Martínez',
    correo: 'ana@example.com',
    telefono: '3003334455',
    activo: true,
    roles: ['ADMINISTRADOR'],
  },
];

describe('UsuariosPageComponent', () => {
  let httpMock: HttpTestingController;
  let usuarioService: UsuarioService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuariosPageComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    usuarioService = TestBed.inject(UsuarioService);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('edita una copia, agrega perfiles sin duplicarlos y alterna el estado local', async () => {
    const f = TestBed.createComponent(UsuariosPageComponent);
    f.detectChanges();
    httpMock.expectOne('/api/usuarios').flush(usuariosMock);
    const c = f.componentInstance;
    c.guardarEdicionLocal();
    c.confirmarAgregarPerfil();
    c.abrirAgregarPerfil(usuariosMock[0]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Código estudiantil');
    c.abrirEditarUsuario(usuariosMock[0]);
    expect(c.usuarioAgregandoPerfil()).toBeNull();
    c.usuarioEditando()!.nombre = 'Pedro actualizado';
    expect(usuariosMock[0].nombre).toBe('Pedro');
    f.detectChanges();
    await f.whenStable();
    expect(f.nativeElement.querySelector('input[name="editNombre"]').value).toBe(
      'Pedro actualizado',
    );
    const guardar = (
      Array.from(f.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
    ).find((b) => b.textContent?.trim() === 'Guardar cambios')!;
    guardar.click();
    expect(c.usuarios()[0].nombre).toBe('Pedro actualizado');
    expect(c.usuarios()[1]).toEqual(usuariosMock[1]);
    expect(c.usuarioEditando()).toBeNull();
    c.abrirAgregarPerfil(c.usuarios()[0]);
    c.nuevoPerfilRol = 'TUTOR';
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Tarifa por hora');
    c.confirmarAgregarPerfil();
    expect(c.usuarios()[0].roles).toEqual(['ESTUDIANTE', 'TUTOR']);
    c.abrirAgregarPerfil(c.usuarios()[0]);
    c.confirmarAgregarPerfil();
    expect(c.usuarios()[0].roles).toEqual(['ESTUDIANTE', 'TUTOR']);
    c.alternarEstadoUsuario(c.usuarios()[0]);
    expect(c.usuarios()[0].activo).toBe(false);
    c.alternarEstadoUsuario(c.usuarios()[0]);
    expect(c.usuarios()[0].activo).toBe(true);
    f.destroy();
  });

  it('restringe el registro a administradores y permite reintentar sin duplicar peticiones', () => {
    const f = TestBed.createComponent(UsuariosPageComponent);
    f.detectChanges();
    httpMock.expectOne('/api/usuarios').flush(usuariosMock);
    const c = f.componentInstance;
    const nuevo: RegistroUsuario = {
      nombre: 'Eva',
      apellido: 'Díaz',
      correo: 'eva@test.edu',
      contrasena: 'Clave123!',
      rol: 'ESTUDIANTE',
      telefono: '',
      activo: true,
      roles: ['ESTUDIANTE'],
      codigoEstudiantil: '123',
      universidad: 'Universidad',
      programaAcademico: 'Ingeniería',
      semestre: '3',
      biografia: '',
      materias: '',
      tarifaPorHora: '',
    };
    c.guardarUsuario(nuevo);
    httpMock.expectNone('/api/usuarios');
    c.auth.sesion.set({ rol: 'ADMINISTRADOR', perfilId: 3, nombreUsuario: 'Ana' });
    c.guardarUsuario(nuevo);
    c.guardarUsuario(nuevo);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Registrando usuario');
    const req = httpMock.expectOne('/api/usuarios');
    expect(req.request.method).toBe('POST');
    req.flush({ mensaje: 'Correo duplicado' }, { status: 409, statusText: 'Conflict' });
    expect(c.mensajeError()).toBe('Correo duplicado');
    expect(c.guardando()).toBe(false);
    c.guardarUsuario(nuevo);
    httpMock.expectOne('/api/usuarios').flush(null);
    httpMock.expectOne('/api/usuarios').flush(usuariosMock);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Usuario registrado.');
    expect(c.mensajeError()).toBe('');
    f.destroy();
  });

  it('limpia la selección cuando falla la consulta del usuario', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const f = TestBed.createComponent(UsuariosPageComponent);
    f.detectChanges();
    httpMock.expectOne('/api/usuarios').flush(usuariosMock);
    const c = f.componentInstance;
    c.seleccionarUsuario(1);
    httpMock.expectOne('/api/usuarios/1').error(new ProgressEvent('error'));
    expect(c.usuarioActual()).toBeNull();
    f.destroy();
  });

  it('carga inicialmente el listado mediante listado$, async pipe y filtra con combineLatest (Actividad 1, 5 y 8)', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/usuarios');
    expect(req.request.method).toBe('GET');
    req.flush(usuariosMock);

    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    expect(fixture.componentInstance.usuarios()).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('Pedro');
    expect(fixture.nativeElement.textContent).toContain('Juan');

    fixture.componentInstance.filtro.setValue('juan');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Juan');
    expect(fixture.nativeElement.textContent).not.toContain('1 - Pedro');

    fixture.destroy();
    vi.useRealTimers();
  });

  it('controla el error con catchError cuando falla la carga (Actividad 1 y 5)', () => {
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/usuarios');
    req.error(new ProgressEvent('Network error'));
    fixture.detectChanges();

    expect(fixture.componentInstance.mensajeError()).toBe(
      'No hay conexión con el servidor. Conservamos tus datos; reintenta.',
    );
    spyError.mockRestore();
    fixture.destroy();
  });

  it('no ofrece la acción eliminada de examinar usuarios', () => {
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/usuarios').flush(usuariosMock);
    expect(fixture.nativeElement.textContent).not.toContain('Examinar usuarios');
    fixture.destroy();
  });

  it('cancela la consulta anterior con switchMap y comparte la selección con BehaviorSubject (Actividad 3 y 7)', async () => {
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/usuarios').flush(usuariosMock);

    fixture.componentInstance.seleccionarUsuario(1);
    const reqPedro = httpMock.expectOne('/api/usuarios/1');

    // Selecciona inmediatamente a Juan antes de que responda Pedro
    fixture.componentInstance.seleccionarUsuario(2);
    expect(reqPedro.cancelled).toBe(true);

    const reqJuan = httpMock.expectOne('/api/usuarios/2');
    reqJuan.flush(usuariosMock[1]);
    fixture.detectChanges();

    expect(fixture.componentInstance.usuarioActual()?.nombre).toBe('Juan');
    const compartido = await firstValueFrom(usuarioService.usuarioSeleccionado$);
    expect(compartido?.nombre).toBe('Juan');
    fixture.destroy();
  });

  it('ignora clics repetidos con exhaustMap mientras una consulta sigue activa (Actividad 5)', () => {
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    fixture.detectChanges();

    // Mientras la primera petición sigue pendiente, varios clics en solicitarActualizacion() se ignoran
    fixture.componentInstance.solicitarActualizacion();
    fixture.componentInstance.solicitarActualizacion();

    const pendientes = httpMock.match((req) => req.url.startsWith('/api/usuarios'));
    expect(pendientes).toHaveLength(1);
    pendientes[0].flush(usuariosMock);
    fixture.destroy();
  });
});
