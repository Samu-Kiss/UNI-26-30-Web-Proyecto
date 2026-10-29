import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TutorApi } from '../../../../core/services/api.service';
import { TutorEditorComponent } from './tutor-editor';

describe('TutorEditorComponent', () => {
  let fixture: ComponentFixture<TutorEditorComponent>;
  let component: TutorEditorComponent;
  let componentRef: ComponentRef<TutorEditorComponent>;

  const tutorMock: TutorApi = {
    id: 10,
    usuarioId: 20,
    nombre: 'Ana Tutor',
    tarifaPorHora: 50000,
    biografia: 'Experiencia en cálculo y álgebra',
    disponible: true,
    materias: [],
    calificacion: 4.8,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorEditorComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('tutor', tutorMock);
    fixture.detectChanges();
  });

  it('inicializa el formulario con los datos del tutor y emite cambios al guardar', () => {
    const guardadoSpy = vi.spyOn(component.guardado, 'emit');

    expect(component.form.value.biografia).toBe('Experiencia en cálculo y álgebra');
    expect(component.form.value.tarifaPorHora).toBe(50000);
    expect(component.form.value.disponible).toBe(true);

    component.form.controls.tarifaPorHora.setValue(60000);
    component.guardar();

    expect(guardadoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tarifaPorHora: 60000,
        biografia: 'Experiencia en cálculo y álgebra',
        disponible: true,
      }),
    );
  });

  it('valida campos requeridos y no emite si el formulario es invalido o esta ocupado', () => {
    const guardadoSpy = vi.spyOn(component.guardado, 'emit');

    component.form.controls.tarifaPorHora.setValue(0); // below min
    component.form.controls.biografia.setValue(''); // required
    fixture.detectChanges();

    component.guardar();
    expect(guardadoSpy).not.toHaveBeenCalled();

    // Now valid but ocupado
    component.form.controls.tarifaPorHora.setValue(50000);
    component.form.controls.biografia.setValue('Valida');
    componentRef.setInput('ocupado', true);
    fixture.detectChanges();

    component.guardar();
    expect(guardadoSpy).not.toHaveBeenCalled();
  });

  it('permite cancelar reseteando el formulario y emitiendo cancelado', () => {
    const canceladoSpy = vi.spyOn(component.cancelado, 'emit');

    component.form.controls.tarifaPorHora.setValue(99999);
    component.cancelar();

    expect(canceladoSpy).toHaveBeenCalled();
    expect(component.form.value.tarifaPorHora).toBe(50000);
  });
});
