import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AdministradoresPageComponent } from './administradores-page/administradores-page';
import { CalendarioPageComponent } from './calendario-page/calendario-page';
import { EstudiantesPageComponent } from './estudiantes-page/estudiantes-page';
import { LandingPageComponent } from './landing-page/landing-page';
import { MensajesPageComponent } from './mensajes-page/mensajes-page';
import { MenuRolPageComponent } from './menu-rol-page/menu-rol-page';
import { ResenasPageComponent } from './resenas-page/resenas-page';
import { ReservaDetallePageComponent } from './reserva-detalle-page/reserva-detalle-page';
import { TutorPerfilPageComponent } from './tutor-perfil-page/tutor-perfil-page';
import { AuthService } from '../core/services/auth.service';

describe('Vistas migradas desde Figma Mockups MyT y Thymeleaf', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '1' }),
              queryParamMap: convertToParamMap({}),
              data: {},
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('renderiza 00 · Landing MyT con secciones de hero, cómo funciona y tutores destacados', () => {
    const fixture = TestBed.createComponent(LandingPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Tu próxima tutoría empieza con la persona correcta.',
    );
    expect(fixture.nativeElement.textContent).toContain('Cómo funciona');
  });

  it('renderiza 02 · Perfil del tutor con disponibilidad interactiva y reseñas', () => {
    const fixture = TestBed.createComponent(TutorPerfilPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Laura Mendoza');
    expect(fixture.nativeElement.textContent).toContain('Próxima disponibilidad');

    const c = fixture.componentInstance;
    c.seleccionarDia(1);
    expect(c.indiceDia()).toBe(1);
    expect(c.horarioSeleccionado()).toBeTruthy();
  });

  it('renderiza 05 · Calendario con agenda mensual y próximas tutorías', () => {
    const fixture = TestBed.createComponent(CalendarioPageComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).toContain('Mi calendario');
    expect(fixture.nativeElement.textContent).toContain('Septiembre 2026');
    c.cambiarMes(1);
    expect(c.mesActual()).toBe('Octubre 2026');
    c.cambiarMes(-2);
    expect(c.mesActual()).toBe('Agosto 2026');
    c.irAHoy();
    expect(c.mesActual()).toBe('Septiembre 2026');
  });

  it('renderiza 06 · Detalle y reprogramación de la tutoría', () => {
    const fixture = TestBed.createComponent(ReservaDetallePageComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).toContain('Detalle de la tutoría');
    expect(fixture.nativeElement.textContent).toContain('Reprogramar tutoría');
    c.proponerHorario();
    expect(c.aviso()).toContain('Propuesta enviada');
    c.cancelarTutoria();
    expect(c.aviso()).toContain('cancelada');
  });

  it('renderiza 07 · Chat de coordinación y permite enviar mensajes', () => {
    const fixture = TestBed.createComponent(MensajesPageComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    comp.nuevoMensaje = 'Hola Laura, te comparto el taller.';
    comp.enviarMensaje();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hola Laura, te comparto el taller.');
    comp.busqueda.set('Laura');
    expect(comp.conversacionesFiltradas().length).toBeGreaterThan(0);
    comp.seleccionarConversacion(1);
    expect(comp.conversacionActivaId()).toBe(1);
  });

  it('renderiza 08 · Dejar reseña y permite alternar etiquetas destacables', () => {
    const fixture = TestBed.createComponent(ResenasPageComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    comp.alternarDestacado('Material útil');
    expect(comp.esDestacado('Material útil')).toBe(true);
    comp.alternarDestacado('Material útil');
    expect(comp.esDestacado('Material útil')).toBe(false);
    comp.calificacion.set(4);
    expect(comp.etiquetaCalificacion()).toBe('Muy buena');
    comp.calificacion.set(3);
    expect(comp.etiquetaCalificacion()).toBe('Buena');
    comp.calificacion.set(2);
    expect(comp.etiquetaCalificacion()).toBe('Regular');
    comp.calificacion.set(1);
    expect(comp.etiquetaCalificacion()).toBe('Por mejorar');
    comp.publicarResena();
    expect(comp.enviada()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cuéntanos cómo te fue');
  });

  it('gestiona parametros de tutor y reserva en resenas y mensajes', () => {
    const route = TestBed.inject(ActivatedRoute);
    (route as { snapshot: unknown }).snapshot = {
      paramMap: convertToParamMap({ id: '1' }),
      queryParamMap: convertToParamMap({
        tutor: '2',
        tutorNombre: 'Profesor X',
        tema: 'Álgebra',
        reserva: '1',
      }),
      data: {},
    };
    const resenaFixture = TestBed.createComponent(ResenasPageComponent);
    resenaFixture.detectChanges();
    expect(resenaFixture.componentInstance.tutorSeleccionado()).toBe('Profesor X');
    expect(resenaFixture.componentInstance.tutorId()).toBe(2);

    const msgFixture = TestBed.createComponent(MensajesPageComponent);
    msgFixture.detectChanges();
    expect(msgFixture.componentInstance.conversacionActivaId()).toBe(1);
  });

  it('renderiza los menús por rol y directorios de estudiantes y administradores', () => {
    const menuFixture = TestBed.createComponent(MenuRolPageComponent);
    menuFixture.detectChanges();
    expect(menuFixture.nativeElement.textContent).toContain('Consultar tutores');

    const estFixture = TestBed.createComponent(EstudiantesPageComponent);
    estFixture.detectChanges();
    expect(estFixture.nativeElement.textContent).toContain('Estudiantes');

    const admFixture = TestBed.createComponent(AdministradoresPageComponent);
    admFixture.detectChanges();
    expect(admFixture.nativeElement.textContent).toContain('Administradores');
  });

  it('filtra y sincroniza estudiantes desde la API', () => {
    const httpMock = TestBed.inject(HttpTestingController);
    const estFixture = TestBed.createComponent(EstudiantesPageComponent);
    estFixture.detectChanges();
    const c = estFixture.componentInstance;

    const reqEst = httpMock.expectOne('/api/estudiantes');
    reqEst.flush([
      {
        id: 99,
        usuarioId: 101,
        nombreCompleto: 'Estudiante Nuevo',
        correo: 'nuevo@correo.com',
        codigoEstudiantil: '20261999',
        universidad: 'Javeriana',
        programaAcademico: 'Sistemas',
        semestre: 3,
        activo: true,
      },
      {
        id: 1,
        usuarioId: 10,
        nombreCompleto: 'Sofía Martínez',
        correo: 'sofia.martinez@myt.edu.co',
        codigoEstudiantil: '20261011',
        universidad: 'Universidad Nacional',
        programaAcademico: 'Ingeniería',
        semestre: 4,
        activo: true,
      },
    ]);

    const reqUsr = httpMock.expectOne('/api/usuarios');
    reqUsr.flush([
      {
        id: 202,
        nombre: 'Pedro',
        apellido: 'Pérez',
        correo: 'pedro.perez@myt.edu.co',
        roles: ['ESTUDIANTE'],
        activo: true,
      },
    ]);

    expect(c.registros().some((e) => e.correo === 'nuevo@correo.com')).toBe(true);
    expect(c.registros().some((e) => e.correo === 'pedro.perez@myt.edu.co')).toBe(true);

    c.filtro.set('Nuevo');
    expect(c.estudiantesFiltrados().length).toBe(1);
    expect(c.estudiantesFiltrados()[0].nombreCompleto).toBe('Estudiante Nuevo');

    c.filtro.set('20261999');
    expect(c.estudiantesFiltrados().length).toBe(1);

    c.filtro.set('Javeriana');
    expect(c.estudiantesFiltrados().length).toBeGreaterThanOrEqual(1);

    c.filtro.set('Sistemas');
    expect(c.estudiantesFiltrados().length).toBeGreaterThanOrEqual(1);

    c.filtro.set('');
    expect(c.estudiantesFiltrados().length).toBeGreaterThan(1);
  });

  it('filtra administradores y sincroniza usuarios cuando la sesión es de rol ADMINISTRADOR', () => {
    const auth = TestBed.inject(AuthService);
    auth.sesion.set({ rol: 'ADMINISTRADOR', perfilId: 1, nombreUsuario: 'Admin' });
    const httpMock = TestBed.inject(HttpTestingController);

    const admFixture = TestBed.createComponent(AdministradoresPageComponent);
    admFixture.detectChanges();
    const c = admFixture.componentInstance;

    const req = httpMock.expectOne('/api/usuarios');
    req.flush([
      {
        id: 50,
        nombre: 'Super',
        apellido: 'Admin',
        correo: 'super.admin@myt.edu.co',
        roles: ['ADMINISTRADOR'],
        activo: true,
      },
    ]);

    expect(c.administradores().length).toBe(1);
    c.filtro.set('Super');
    expect(c.administradoresFiltrados().length).toBe(1);
    c.filtro.set('super.admin@myt.edu.co');
    expect(c.administradoresFiltrados().length).toBe(1);
    c.filtro.set('no-existe');
    expect(c.administradoresFiltrados().length).toBe(0);
    c.filtro.set('');
    expect(c.administradoresFiltrados().length).toBe(1);
  });

  it('cambia las acciones visibles entre los paneles de estudiante, tutor y administrador', () => {
    TestBed.inject(AuthService).sesion.set({ rol: 'TUTOR', perfilId: 1, nombreUsuario: 'Ana' });
    const f = TestBed.createComponent(MenuRolPageComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Hola, Ana');
    expect(f.nativeElement.textContent).toContain('Panel de tutor');
    expect(f.nativeElement.querySelector('[aria-label="Acciones de tutor"]')).not.toBeNull();
    const tabs = f.nativeElement.querySelectorAll('[role="tab"]');
    tabs[2].click();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Panel administrativo');
    expect(
      f.nativeElement
        .querySelector('[aria-label="Acciones administrativas"] a')
        .getAttribute('href'),
    ).toBe('/usuarios');
    expect(f.nativeElement.querySelector('[aria-label="Acciones de tutor"]')).toBeNull();
    tabs[0].click();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Panel de estudiante');
    expect(f.nativeElement.querySelector('[aria-label="Acciones de estudiante"]')).not.toBeNull();
    tabs[1].click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[aria-label="Acciones de tutor"]')).not.toBeNull();
    f.destroy();
  });
});
