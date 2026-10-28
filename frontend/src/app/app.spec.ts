import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { ApiService } from './core/services/api.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
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
            restaurar: () => of({ actual: { rol: 'ADMINISTRADOR' }, opciones: [] }),
          },
        },
        {
          provide: ApiService,
          useValue: {
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

  it('shows the migrated tutors view', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Tutores');
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
