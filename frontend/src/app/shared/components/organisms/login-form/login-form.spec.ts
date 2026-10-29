import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LoginFormComponent } from './login-form';

describe('LoginFormComponent', () => {
  let fixture: ComponentFixture<LoginFormComponent>;
  let component: LoginFormComponent;
  let componentRef: ComponentRef<LoginFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('emite credenciales cuando el formulario es valido sin activar validaciones antes de la redirección', async () => {
    const emitSpy = vi.spyOn(component.loginEnviado, 'emit');

    const emailInput = fixture.nativeElement.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement;
    const passInput = fixture.nativeElement.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;

    emailInput.value = 'usuario@correo.com';
    emailInput.dispatchEvent(new Event('input'));
    passInput.value = 'Secreta123!';
    passInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();
    await fixture.whenStable();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith({
      correo: 'usuario@correo.com',
      contrasena: 'Secreta123!',
    });
    expect(component.contrasena).toBe('Secreta123!');
  });

  it('no emite si esta deshabilitado o si el correo esta vacio', async () => {
    const emitSpy = vi.spyOn(component.loginEnviado, 'emit');

    componentRef.setInput('habilitado', false);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(emitSpy).not.toHaveBeenCalled();

    componentRef.setInput('habilitado', true);
    component.correo = '   ';
    component.contrasena = 'clave';
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
