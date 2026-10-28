import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { Usuario } from '../../core/models/usuario.model';
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

describe('UsuariosPageComponent - Laboratorio RxJS', () => {
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

  it('examina usuarios con of, from, range y new Observable (Actividad 2)', () => {
    const spyLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/usuarios').flush(usuariosMock);
    fixture.componentInstance.examinarUsuarios();

    expect(spyLog).toHaveBeenCalledWith('OF: total', 3);
    expect(spyLog).toHaveBeenCalledWith('FROM:', 1, 'Pedro');
    expect(spyLog).toHaveBeenCalledWith('RANGE:', 0, 'Pedro');
    expect(spyLog).toHaveBeenCalledWith('MANUAL:', 'Se recibieron 3 usuarios');
    expect(spyLog).toHaveBeenCalledWith('MANUAL:', 'Exploración de usuarios finalizada');
    spyLog.mockRestore();
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

  it('ejecuta consultas en orden con concatMap y concurrentes con mergeMap (Actividad 4)', () => {
    const spyLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/usuarios').flush(usuariosMock);

    // concatMap: solo 1 petición activa a la vez
    fixture.componentInstance.revisarEnOrden();
    const req1 = httpMock.expectOne('/api/usuarios/1');
    req1.flush(usuariosMock[0]);
    const req2 = httpMock.expectOne('/api/usuarios/2');
    req2.flush(usuariosMock[1]);
    const req3 = httpMock.expectOne('/api/usuarios/3');
    req3.flush(usuariosMock[2]);
    expect(fixture.componentInstance.resultadosRevision().map((u) => u.id)).toEqual([1, 2, 3]);

    // mergeMap(..., 2): 2 peticiones activas simultáneamente
    fixture.componentInstance.revisarSimultaneamente();
    const concurrentes = httpMock.match((req) => req.url.startsWith('/api/usuarios'));
    expect(concurrentes).toHaveLength(2);
    concurrentes[0].flush(usuariosMock[0]);
    const reqRestante = httpMock.expectOne('/api/usuarios/3');
    concurrentes[1].flush(usuariosMock[1]);
    reqRestante.flush(usuariosMock[2]);
    expect(fixture.componentInstance.resultadosRevision()).toHaveLength(3);

    spyLog.mockRestore();
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

  it('compara dos usuarios esperando ambas respuestas con forkJoin (Actividad 9)', () => {
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/usuarios').flush(usuariosMock);

    fixture.componentInstance.compararUsuarios();
    const peticiones = httpMock.match((req) => req.url.startsWith('/api/usuarios'));
    expect(peticiones).toHaveLength(2);

    peticiones[0].flush(usuariosMock[0]);
    expect(fixture.componentInstance.comparacion()).toBeNull();

    peticiones[1].flush(usuariosMock[1]);
    expect(fixture.componentInstance.comparacion()?.primero?.nombre).toBe('Pedro');
    expect(fixture.componentInstance.comparacion()?.segundo?.nombre).toBe('Juan');
    fixture.destroy();
  });
});
