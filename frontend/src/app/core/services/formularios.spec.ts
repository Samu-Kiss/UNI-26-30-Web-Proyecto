import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { BackendFormService } from './backend-form.service';
import { UsuarioService } from './usuario.service';

const cuenta = {
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana@example.com',
  telefono: '',
  activo: true,
  roles: ['ESTUDIANTE'] as 'ESTUDIANTE'[],
  contrasena: 'clave-prueba',
  rol: 'ESTUDIANTE' as const,
  codigoEstudiantil: '123',
  universidad: 'Javeriana',
  programaAcademico: 'Ingeniería',
  semestre: '3',
  biografia: '',
  materias: '',
  tarifaPorHora: '',
};

describe('Comunicación de formularios con el backend', () => {
  const enviar = vi.fn();
  beforeEach(() => {
    enviar.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: BackendFormService, useValue: { enviar } }],
    });
  });

  it('envía las credenciales desde el hijo al servicio del padre', async () => {
    const harness = await RouterTestingHarness.create('/login');
    const element = harness.routeNativeElement!;
    const correo = element.querySelector<HTMLInputElement>('[name="correo"]')!;
    const clave = element.querySelector<HTMLInputElement>('[name="contrasena"]')!;
    correo.value = 'ana@example.com';
    correo.dispatchEvent(new Event('input'));
    clave.value = 'clave-prueba';
    clave.dispatchEvent(new Event('input'));
    harness.detectChanges();
    await harness.fixture.whenStable();
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(enviar).toHaveBeenCalledWith('/login', {
      correo: 'ana@example.com',
      contrasena: 'clave-prueba',
    });
  });

  it('envía un registro completo desde el formulario al servicio con la sesión', async () => {
    const harness = await RouterTestingHarness.create('/usuarios/nuevo?sesion=admin-prueba');
    const element = harness.routeNativeElement!;
    for (const name of [
      'nombre',
      'apellido',
      'correo',
      'contrasena',
      'codigoEstudiantil',
      'universidad',
      'programaAcademico',
      'semestre',
    ] as const) {
      const input = element.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
      input.value = cuenta[name];
      input.dispatchEvent(new Event('input'));
    }
    harness.detectChanges();
    await harness.fixture.whenStable();
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(enviar).toHaveBeenCalledWith(
      '/usuarios/registrar',
      expect.objectContaining({
        nombre: 'Ana',
        apellido: 'Pérez',
        rol: 'ESTUDIANTE',
        semestre: '3',
        sesion: 'admin-prueba',
      }),
    );
  });

  it('rechaza registros sin sesión y no conserva contraseñas en el servicio', () => {
    const service = TestBed.inject(UsuarioService);
    expect(() => service.guardar(cuenta, '')).toThrow('Inicia sesión');
    expect(enviar).not.toHaveBeenCalled();
  });

  it('deshabilita el formulario sin sesión', async () => {
    const harness = await RouterTestingHarness.create('/usuarios/nuevo');
    expect(harness.routeNativeElement!.querySelector('fieldset')!.disabled).toBe(true);
  });
});
