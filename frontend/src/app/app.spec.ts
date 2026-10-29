import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from './core/services/auth.service';
import { ApiService } from './core/services/api.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';
import { RouterTestingHarness } from '@angular/router/testing';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            sesion: signal({ rol: 'ADMINISTRADOR' }),
            opciones: signal<string[]>([]),
            cargando: signal(false),
            restaurar: () => of({ actual: { rol: 'ADMINISTRADOR' }, opciones: [] }),
            cerrar: vi.fn(() => of(undefined)),
          },
        },
        {
          provide: ApiService,
          useValue: {
            cambios: new Subject<void>(),
            reservas: () => of([]),
            materias: () => of([]),
            tutores: () => of({ content: [], totalPages: 0, totalElements: 0, number: 0 }),
          },
        },
      ],
    }).compileComponents();
  });

  it('creates the application', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra navegación administrativa y permite reintentar el cierre de sesión', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    await router.navigateByUrl('/tutores');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.myt-sidebar').textContent).toContain(
      'Administración',
    );
    vi.mocked(auth.cerrar).mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    fixture.nativeElement.querySelector('button.myt-sidebar__logout').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'No hay conexión',
    );
    expect(router.url).toBe('/tutores');
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.nativeElement.querySelector('button.myt-sidebar__logout').click();
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(fixture.componentInstance.errorSesion()).toBe('');
    navigate.mockRestore();
    fixture.destroy();
  });

  it('oculta administración a estudiantes y muestra acceso cuando no hay sesión', async () => {
    const auth = TestBed.inject(AuthService);
    auth.sesion.set({ rol: 'ESTUDIANTE', perfilId: 2, nombreUsuario: 'Eva' });
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/tutores');
    fixture.detectChanges();
    const sidebar = fixture.nativeElement.querySelector('.myt-sidebar');
    expect(sidebar.textContent).toContain('Eva');
    expect(sidebar.textContent).not.toContain('Administración');
    auth.sesion.set(null);
    fixture.detectChanges();
    expect(sidebar.textContent).toContain('Iniciar sesión');
    expect(sidebar.querySelector('button.myt-sidebar__logout')).toBeNull();
    fixture.destroy();
  });

  it('shows the landing view on / and migrated tutors view on /tutores', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Tu próxima tutoría empieza con la persona correcta.',
    );
    await harness.navigateByUrl('/tutores');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Encuentra al tutor ideal',
    );
  });

  it('permite abrir el menú móvil y lo cierra al navegar', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/tutores');
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector('.myt-sidebar__toggle');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    boton.click();
    fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.myt-sidebar--open')).not.toBeNull();
    await router.navigateByUrl('/reservas');
    fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    fixture.destroy();
  });

  it('renders /login without sidebar or topbar', async () => {
    const auth = TestBed.inject(AuthService);
    auth.restaurar = () => of({ actual: null, opciones: [] });
    const fixture = TestBed.createComponent(App);
    const router = fixture.debugElement.injector.get((await import('@angular/router')).Router);
    await router.navigateByUrl('/login');
    fixture.detectChanges();
    expect(fixture.componentInstance.esLanding()).toBe(true);
    expect(fixture.nativeElement.querySelector('.myt-sidebar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.myt-topbar')).toBeNull();
  });

  it('provides the intentional error used to verify Sentry', () => {
    const fixture = TestBed.createComponent(App);
    expect(() => fixture.componentInstance.throwTestError()).toThrowError('Sentry Test Error');
  });

  it('records the identifier emitted after Sentry sends an event', () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.handleSentryEventSent(
      new CustomEvent<string>('sentry-event-sent', { detail: 'test-event-id' }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.sentryEventId()).toBe('test-event-id');
  });

  it('renders sentry test panel when enabled', () => {
    const fixture = TestBed.createComponent(App);
    Object.defineProperty(fixture.componentInstance, 'sentryTestEnabled', {
      value: true,
      writable: true,
    });
    fixture.componentInstance.sentryEventId.set('test-123');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sentry-test')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('output')?.textContent).toContain('test-123');
  });
});
