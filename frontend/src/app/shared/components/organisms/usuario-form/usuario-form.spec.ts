import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UsuarioFormComponent } from './usuario-form';

describe('Registro de usuarios', () => {
  it.each(['ESTUDIANTE', 'TUTOR'] as const)(
    'valida y emite el perfil %s limpiando espacios y contraseña',
    async (rol) => {
      const f = TestBed.createComponent(UsuarioFormComponent);
      const c = f.componentInstance;
      const emit = vi.spyOn(c.usuarioGuardado, 'emit');
      c.rol = rol;
      f.detectChanges();
      await f.whenStable();
      const completar = (nombre: string, valor: string) => {
        const input = f.nativeElement.querySelector(`[name="${nombre}"]`) as HTMLInputElement;
        input.value = valor;
        input.dispatchEvent(new Event('input'));
      };
      completar('nombre', '  Eva  ');
      completar('apellido', '  Díaz  ');
      completar('correo', 'eva@example.com');
      completar('contrasena', 'Clave123!');
      completar('telefono', ' 3001234567 ');
      if (rol === 'ESTUDIANTE') {
        completar('codigoEstudiantil', ' 123 ');
        completar('semestre', '3');
        completar('universidad', ' Universidad ');
        completar('programaAcademico', ' Ingeniería ');
      } else {
        completar('materias', ' Cálculo ');
        completar('tarifaPorHora', '45000');
        completar('biografia', ' Tutora de cálculo ');
      }
      await f.whenStable();
      f.nativeElement
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      expect(emit).toHaveBeenCalledOnce();
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Eva',
          apellido: 'Díaz',
          correo: 'eva@example.com',
          telefono: '3001234567',
          contrasena: 'Clave123!',
          roles: [rol],
          rol,
          activo: true,
        }),
      );
      expect(c.contrasena).toBe('');
      if (rol === 'TUTOR') {
        expect(emit).toHaveBeenCalledWith(
          expect.objectContaining({
            materias: 'Cálculo',
            tarifaPorHora: '45000',
            biografia: 'Tutora de cálculo',
          }),
        );
      } else {
        expect(emit).toHaveBeenCalledWith(
          expect.objectContaining({
            codigoEstudiantil: '123',
            semestre: '3',
            universidad: 'Universidad',
          }),
        );
      }
      f.destroy();
    },
  );

  it('rechaza formularios incompletos y deshabilitados mostrando la validación', async () => {
    const f = TestBed.createComponent(UsuarioFormComponent);
    const emit = vi.spyOn(f.componentInstance.usuarioGuardado, 'emit');
    f.detectChanges();
    await f.whenStable();
    const form = f.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    f.detectChanges();
    expect(emit).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).toContain('Debe ingresar el nombre');
    expect(f.nativeElement.textContent).toContain('Revisa los campos obligatorios');
    f.componentRef.setInput('habilitado', false);
    f.detectChanges();
    expect(f.nativeElement.querySelector('fieldset').disabled).toBe(true);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(emit).not.toHaveBeenCalled();
    f.destroy();
  });
});
