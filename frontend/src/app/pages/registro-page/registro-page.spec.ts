import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
    comp.datos.apellido = 'Ruiz';
    comp.datos.correo = 'carlos@test.edu';
    comp.datos.contrasena = 'corta';
    comp.registrar();
    expect(comp.error()).toContain('al menos 8 caracteres');
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
});
