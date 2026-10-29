import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService, TutorApi } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LandingPageComponent } from './landing-page';

describe('LandingPageComponent (Hero y áreas de conocimiento)', () => {
  const tutorEjemplo: TutorApi = {
    id: 1,
    usuarioId: 10,
    nombre: 'Elena Guerrero',
    biografia: 'Docente de Matemáticas y Física con 5 años de experiencia.',
    tarifaPorHora: 45000,
    disponible: true,
    materias: [{ id: 1, nombre: 'Cálculo' }],
    calificacion: 5.0,
  };

  const apiMock = {
    tutores: vi.fn(() => of({ content: [tutorEjemplo], totalElements: 1, totalPages: 1, number: 0 })),
  };

  beforeEach(() => {
    apiMock.tutores.mockReset().mockReturnValue(of({ content: [tutorEjemplo], totalElements: 1, totalPages: 1, number: 0 }));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ApiService, useValue: apiMock },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  function montar(autenticado = false) {
    if (autenticado) {
      TestBed.inject(AuthService).sesion.set({
        rol: 'ESTUDIANTE',
        perfilId: 2,
        nombreUsuario: 'Samuel',
      });
    }
    const fixture = TestBed.createComponent(LandingPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra las áreas de conocimiento en la tarjeta de búsqueda del hero con enlaces a tutores', () => {
    const fixture = montar(false);
    const texto = fixture.nativeElement.textContent;

    expect(texto).toContain('Áreas de conocimiento');
    expect(texto).toContain('Matemáticas');
    expect(texto).toContain('Programación');
    expect(texto).toContain('Idiomas');

    const enlaces = fixture.nativeElement.querySelectorAll('.myt-landing__preview-list a');
    expect(enlaces.length).toBe(3);
    const hrefs = Array.from(enlaces).map((a: unknown) => (a as HTMLAnchorElement).getAttribute('href'));
    expect(hrefs.some((h) => h?.includes('/tutores') && h.includes('Matem'))).toBe(true);
    expect(hrefs.some((h) => h?.includes('/tutores') && h.includes('Programaci'))).toBe(true);
    expect(hrefs.some((h) => h?.includes('/tutores') && h.includes('Idiomas'))).toBe(true);
    fixture.destroy();
  });

  it('muestra el calendario ilustrativo/falso en el hero con la semana de ejemplo y materias decorativas', () => {
    const fixture = montar(false);
    const board = fixture.nativeElement.querySelector('.myt-week-board');
    expect(board).not.toBeNull();
    expect(board.textContent).toContain('Tu semana en MyT');
    expect(board.textContent).toContain('LUN 7');
    expect(board.textContent).toContain('MAR 8');
    expect(board.textContent).toContain('Cálculo');
    expect(board.textContent).toContain('JUE 10');
    expect(board.textContent).toContain('Inglés');
    expect(board.textContent).toContain('VIE 11');

    // No debe mostrar mensajes vacíos como "No tienes próximas tutorías" en el calendario ilustrativo del hero
    expect(board.textContent).not.toContain('No tienes próximas tutorías');
    fixture.destroy();
  });

  it('permite buscar rápidamente desde el hero redirigiendo a la ruta con parámetro de búsqueda', () => {
    const fixture = montar(false);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.busquedaHero.set('Cálculo diferencial');
    fixture.componentInstance.buscarRapido();
    expect(navigateSpy).toHaveBeenCalledWith(['/tutores'], {
      queryParams: { q: 'Cálculo diferencial' },
    });

    fixture.componentInstance.busquedaHero.set('   ');
    fixture.componentInstance.buscarRapido();
    expect(navigateSpy).toHaveBeenCalledWith(['/tutores']);
    fixture.destroy();
  });

  it('muestra tutores destacados cuando hay sesión activa o invitación a enseñar en estado vacío', () => {
    const fixtureAuth = montar(true);
    expect(apiMock.tutores).toHaveBeenCalled();
    expect(fixtureAuth.componentInstance.destacados().length).toBe(1);
    expect(fixtureAuth.nativeElement.textContent).toContain('Elena Guerrero');
    expect(fixtureAuth.nativeElement.textContent).toContain('Personas reales para retos reales');
    fixtureAuth.destroy();

    apiMock.tutores.mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0, number: 0 }));
    const fixtureVacio = montar(true);
    expect(fixtureVacio.nativeElement.textContent).toContain('Lo que sabes puede abrir caminos');
    expect(fixtureVacio.nativeElement.textContent).toContain('Quiero ser tutor');
    fixtureVacio.destroy();
  });
});
