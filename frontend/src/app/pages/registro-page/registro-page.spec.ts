import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { RegistroPageComponent } from './registro-page';

describe('RegistroPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroPageComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('permite alternar entre estudiante y tutor y valida campos requeridos', () => {
    const fixture = TestBed.createComponent(RegistroPageComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.rolSeleccionado()).toBe('ESTUDIANTE');
    comp.seleccionarRol('TUTOR');
    fixture.detectChanges();
    expect(comp.rolSeleccionado()).toBe('TUTOR');

    comp.datos.nombre = '';
    comp.registrar();
    expect(comp.error()).toContain('Por favor completa tu nombre');

    comp.datos.nombre = 'Carlos';
    comp.datos.apellido = '';
    comp.datos.correo = 'carlos@test.edu';
    comp.registrar();
    expect(comp.error()).toContain('Por favor completa tu nombre');

    comp.datos.apellido = 'Ruiz';
    comp.datos.correo = '';
    comp.registrar();
    expect(comp.error()).toContain('Por favor completa tu nombre');

    comp.datos.correo = 'carlos@test.edu';
    comp.datos.contrasena = 'corta';
    comp.registrar();
    expect(comp.error()).toContain('al menos 8 caracteres');
  });

  it('inicializa con rol TUTOR cuando el queryParam rol es TUTOR', () => {
    const route = TestBed.inject(ActivatedRoute);
    (route as { snapshot: unknown }).snapshot = {
      paramMap: convertToParamMap({}),
      queryParamMap: convertToParamMap({ rol: 'TUTOR' }),
    };
    const fixture = TestBed.createComponent(RegistroPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.rolSeleccionado()).toBe('TUTOR');
    expect(fixture.componentInstance.datos.rol).toBe('TUTOR');
  });

  it('no ejecuta el registro si ya esta guardando', () => {
    const fixture = TestBed.createComponent(RegistroPageComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    comp.guardando.set(true);
    comp.registrar();
    httpMock.expectNone('/api/usuarios');
  });

  it('registra exitosamente un nuevo estudiante', () => {
    const fixture = TestBed.createComponent(RegistroPageComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.datos.nombre = 'Carlos';
    comp.datos.apellido = 'Ruiz';
    comp.datos.correo = 'carlos@test.edu';
    comp.datos.contrasena = 'Password123!';
    comp.datos.codigoEstudiantil = '20261099';
    comp.datos.universidad = 'Universidad Nacional';
    comp.datos.programaAcademico = 'Ingeniería';
    comp.datos.semestre = '4';

    comp.registrar();
    expect(comp.guardando()).toBe(true);

    const req = httpMock.expectOne('/api/usuarios');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.correo).toBe('carlos@test.edu');
    expect(req.request.body.rol).toBe('ESTUDIANTE');
    req.flush(null, { status: 201, statusText: 'Created' });

    expect(comp.exito()).toBe(true);
    expect(comp.guardando()).toBe(false);
  });

  it('registra un tutor y maneja error HTTP si la peticion falla', () => {
    const fixture = TestBed.createComponent(RegistroPageComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.seleccionarRol('TUTOR');
    comp.datos.nombre = 'María';
    comp.datos.apellido = 'López';
    comp.datos.correo = 'maria@test.edu';
    comp.datos.contrasena = 'Password123!';

    comp.registrar();
    expect(comp.guardando()).toBe(true);

    const req = httpMock.expectOne('/api/usuarios');
    expect(req.request.body.rol).toBe('TUTOR');
    req.flush({ mensaje: 'El correo ya está registrado.' }, { status: 409, statusText: 'Conflict' });

    expect(comp.guardando()).toBe(false);
    expect(comp.exito()).toBe(false);
    expect(comp.error()).toContain('El correo ya está registrado.');
  });
});
