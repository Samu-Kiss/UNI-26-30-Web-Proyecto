import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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
  });

  it('renderiza 05 · Calendario con agenda mensual y próximas tutorías', () => {
    const fixture = TestBed.createComponent(CalendarioPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mi calendario');
    expect(fixture.nativeElement.textContent).toContain('Septiembre 2026');
  });

  it('renderiza 06 · Detalle y reprogramación de la tutoría', () => {
    const fixture = TestBed.createComponent(ReservaDetallePageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Detalle de la tutoría');
    expect(fixture.nativeElement.textContent).toContain('Reprogramar tutoría');
  });

  it('renderiza 07 · Chat de coordinación y permite enviar mensajes', () => {
    const fixture = TestBed.createComponent(MensajesPageComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    comp.nuevoMensaje = 'Hola Laura, te comparto el taller.';
    comp.enviarMensaje();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hola Laura, te comparto el taller.');
  });

  it('renderiza 08 · Dejar reseña y permite alternar etiquetas destacables', () => {
    const fixture = TestBed.createComponent(ResenasPageComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    comp.alternarDestacado('Material útil');
    expect(comp.esDestacado('Material útil')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cuéntanos cómo te fue');
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
});
