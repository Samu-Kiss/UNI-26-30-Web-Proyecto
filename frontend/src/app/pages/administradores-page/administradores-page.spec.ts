import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Usuario } from '../../core/models/usuario.model';
import { AdministradoresPageComponent } from './administradores-page';

const mockUsuarios: Usuario[] = [
  {
    id: 1,
    nombre: 'Laura',
    apellido: 'Torres',
    correo: 'laura@universidad.edu.co',
    telefono: '3001234567',
    activo: true,
    roles: ['ADMINISTRADOR'],
  },
  {
    id: 2,
    nombre: 'Carlos',
    apellido: 'Mendoza',
    correo: 'carlos@universidad.edu.co',
    telefono: '3009876543',
    activo: false,
    roles: ['ADMINISTRADOR'],
  },
  {
    id: 3,
    nombre: 'Mariana',
    apellido: 'Rojas',
    correo: 'mariana@universidad.edu.co',
    telefono: '3005557788',
    activo: true,
    roles: ['ESTUDIANTE'],
  },
];

describe('AdministradoresPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdministradoresPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('carga los administradores y calcula las métricas activas e inactivas', () => {
    const fixture = TestBed.createComponent(AdministradoresPageComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/usuarios');
    req.flush(mockUsuarios);

    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.administradores()).toHaveLength(2);
    expect(comp.totalActivos()).toBe(1);
    expect(comp.totalInactivos()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Laura Torres');
    expect(fixture.nativeElement.textContent).toContain('Carlos Mendoza');
    expect(fixture.nativeElement.textContent).not.toContain('Mariana Rojas');

    fixture.destroy();
  });

  it('filtra administradores por nombre o correo', () => {
    const fixture = TestBed.createComponent(AdministradoresPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/usuarios').flush(mockUsuarios);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.filtro.set('Laura');
    fixture.detectChanges();

    expect(comp.administradoresFiltrados()).toHaveLength(1);
    expect(comp.administradoresFiltrados()[0].nombre).toBe('Laura');

    comp.filtro.set('carlos@universidad.edu.co');
    fixture.detectChanges();
    expect(comp.administradoresFiltrados()).toHaveLength(1);
    expect(comp.administradoresFiltrados()[0].nombre).toBe('Carlos');

    comp.filtro.set('inexistente');
    fixture.detectChanges();
    expect(comp.administradoresFiltrados()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain(
      'No hay administradores registrados que coincidan con la búsqueda.',
    );

    fixture.destroy();
  });

  it('permite refrescar manualmente y reintentar ante errores de conexión', () => {
    const fixture = TestBed.createComponent(AdministradoresPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/usuarios').error(new ProgressEvent('error'));
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.error()).toContain('No hay conexión con el servidor');

    comp.cargarAdministradores();
    fixture.detectChanges();

    httpMock.expectOne('/api/usuarios').flush(mockUsuarios);
    fixture.detectChanges();

    expect(comp.error()).toBe('');
    expect(comp.administradores()).toHaveLength(2);

    fixture.destroy();
  });
});
