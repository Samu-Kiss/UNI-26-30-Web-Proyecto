import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PagoPageComponent } from './pago-page';
import { ApiService, OrdenPagoApi, ReservaApi } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

const reservaPendiente: ReservaApi = {
  id: 14,
  tutorId: 7,
  estudianteId: 2,
  tutor: 'Ana Tutor',
  estudiante: 'Sofía Estudiante',
  materia: 'Arquitectura Web',
  fecha: '2030-05-16',
  horaInicio: '10:00:00',
  duracionMinutos: 60,
  tema: 'Integración Wompi',
  estado: 'PENDIENTE',
  costoTotal: 45000,
  estadoPago: 'SIN_PAGO',
};

const ordenPendiente: OrdenPagoApi = {
  referencia: 'ORD-RES14-ABC123',
  reservaId: 14,
  concepto: 'Tutoría de Arquitectura Web con Ana · Integración Wompi',
  montoEnCentavos: 4500000,
  montoCop: 45000,
  estado: 'PENDING',
  wompiTransaccionId: null,
  fechaCreacion: '2026-11-17T12:00:00Z',
  materia: 'Arquitectura Web',
  tutor: 'Ana Tutor',
  estudiante: 'Sofía Estudiante',
  estadoReserva: 'PENDIENTE',
};

const ordenAprobada: OrdenPagoApi = {
  ...ordenPendiente,
  referencia: 'ORD-RES14-OK999',
  reservaId: null,
  estado: 'APPROVED',
  wompiTransaccionId: '12345-sandbox',
};

describe('PagoPageComponent (Wompi Sandbox y órdenes)', () => {
  let queryParams: Record<string, string> = {};
  const api = {
    configuracionPagos: vi.fn(() => of({ habilitado: true, moneda: 'COP' })),
    reservas: vi.fn(() => of([reservaPendiente])),
    ordenesPago: vi.fn(() => of([ordenPendiente, ordenAprobada])),
    checkoutPago: vi.fn(() =>
      of({
        url: 'https://checkout.wompi.co/p/?public-key=pub_test_1&reference=ORD-RES14-ABC123',
        referencia: 'ORD-RES14-ABC123',
        montoEnCentavos: 4500000,
        concepto: 'Tutoría de Arquitectura Web',
        reservaId: 14,
      }),
    ),
    estadoOrdenPago: vi.fn(() =>
      of({
        referencia: 'ORD-RES14-ABC123',
        estado: 'APPROVED',
        montoEnCentavos: 4500000,
        concepto: 'Tutoría de Arquitectura Web',
        reservaId: 14,
        wompiTransaccionId: 'tx-100',
      }),
    ),
  };

  function configurarModulo() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: ApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return convertToParamMap(queryParams);
              },
            },
          },
        },
      ],
    });
    TestBed.inject(AuthService).sesion.set({
      rol: 'ESTUDIANTE',
      perfilId: 2,
      nombreUsuario: 'Sofía Estudiante',
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    queryParams = {};
    api.configuracionPagos.mockReturnValue(of({ habilitado: true, moneda: 'COP' }));
    api.reservas.mockReturnValue(of([reservaPendiente]));
    api.ordenesPago.mockReturnValue(of([ordenPendiente, ordenAprobada]));
    api.checkoutPago.mockReturnValue(
      of({
        url: 'https://checkout.wompi.co/p/?public-key=pub_test_1&reference=ORD-RES14-ABC123',
        referencia: 'ORD-RES14-ABC123',
        montoEnCentavos: 4500000,
        concepto: 'Tutoría de Arquitectura Web',
        reservaId: 14,
      }),
    );
    api.estadoOrdenPago.mockReturnValue(
      of({
        referencia: 'ORD-RES14-ABC123',
        estado: 'APPROVED',
        montoEnCentavos: 4500000,
        concepto: 'Tutoría de Arquitectura Web',
        reservaId: 14,
        wompiTransaccionId: 'tx-100',
      }),
    );
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('carga reservas pendientes de pago, selecciona por parámetro y genera checkout local', () => {
    queryParams = { reserva: '14' };
    configurarModulo();
    const fixture = TestBed.createComponent(PagoPageComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.habilitado()).toBe(true);
    expect(comp.reservaSeleccionada()?.id).toBe(14);
    expect(comp.reservasPorPagar()).toHaveLength(1);

    // Alternar a abono general y de vuelta a la reserva
    comp.seleccionarReserva(null);
    fixture.detectChanges();
    expect(comp.reservaSeleccionada()).toBeNull();

    comp.seleccionarReserva(reservaPendiente);
    fixture.detectChanges();
    expect(comp.reservaSeleccionada()?.id).toBe(14);

    // Generar checkout sin redirect-url (modo local)
    comp.pagar();
    fixture.detectChanges();
    expect(api.checkoutPago).toHaveBeenCalledWith(14);
    expect(comp.checkout()?.referencia).toBe('ORD-RES14-ABC123');

    // Seguir pago y confirmar aprobación
    comp.seguirPago('ORD-RES14-ABC123');
    vi.advanceTimersByTime(0);
    fixture.detectChanges();
    expect(comp.estadoActual()).toBe('APPROVED');
    expect(comp.reservaPagadaId()).toBe(14);
    expect(comp.mensaje()).toContain('tutoría #14');

    // Reiniciar para un nuevo pago
    comp.nuevoPago();
    expect(comp.checkout()).toBeNull();
    expect(comp.estadoActual()).toBe('');
  });

  it('consulta referencia inicial desde URL y maneja estados DECLINED, PENDING y errores', () => {
    queryParams = { referencia: 'ORD-RES14-ABC123', id: 'tx-999' };
    api.estadoOrdenPago.mockReturnValueOnce(
      of({
        referencia: 'ORD-RES14-ABC123',
        estado: 'DECLINED',
        montoEnCentavos: 4500000,
        concepto: 'Tutoría',
        reservaId: 14,
        wompiTransaccionId: 'tx-999',
      }),
    );
    configurarModulo();
    const fixture = TestBed.createComponent(PagoPageComponent);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(api.estadoOrdenPago).toHaveBeenCalledWith('ORD-RES14-ABC123', 'tx-999');
    expect(comp.estadoActual()).toBe('DECLINED');
    expect(comp.mensaje()).toContain('Rechazado');

    expect(comp.etiquetaEstadoPago('APPROVED')).toBe('Aprobado');
    expect(comp.etiquetaEstadoPago('PENDING')).toBe('Pendiente');
    expect(comp.etiquetaEstadoPago('DECLINED')).toBe('Rechazado');
    expect(comp.etiquetaEstadoPago('VOIDED')).toBe('Anulado');
    expect(comp.etiquetaEstadoPago('ERROR')).toBe('Error');
    expect(comp.etiquetaEstadoPago('CUSTOM')).toBe('CUSTOM');
  });

  it('maneja pasarela deshabilitada, vista de tutor y errores HTTP en configuración y checkout', () => {
    api.configuracionPagos.mockReturnValueOnce(of({ habilitado: false, moneda: 'COP' }));
    api.reservas.mockReturnValueOnce(throwError(() => new Error('fallo reservas')));
    api.ordenesPago.mockReturnValueOnce(throwError(() => new Error('fallo ordenes')));
    configurarModulo();
    TestBed.inject(AuthService).sesion.set({
      rol: 'TUTOR',
      perfilId: 7,
      nombreUsuario: 'Ana Tutor',
    });

    const fixture = TestBed.createComponent(PagoPageComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.habilitado()).toBe(false);
    expect(comp.esEstudiante()).toBe(false);
    expect(comp.puedeIniciarCheckout()).toBe(false);
    expect(comp.mensaje()).toContain('sin configurar');

    // Error al iniciar checkout
    api.checkoutPago.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { mensaje: 'Wompi no disponible' } }),
      ),
    );
    comp.pagar();
    expect(comp.mensaje()).toContain('Wompi no disponible');

    // Error al consultar orden
    api.estadoOrdenPago.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 404, error: { mensaje: 'Orden no encontrada' } }),
      ),
    );
    comp.seguirPago('ORD-404');
    vi.advanceTimersByTime(0);
    expect(comp.mensaje()).toContain('Orden no encontrada');
  });
});
