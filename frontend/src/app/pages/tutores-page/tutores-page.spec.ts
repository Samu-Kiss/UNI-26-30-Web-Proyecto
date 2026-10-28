import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TutoresPageComponent } from './tutores-page';
import { AuthService } from '../../core/services/auth.service';
import { TutorEditorComponent } from '../../shared/components/organisms/tutor-editor/tutor-editor';
import { TutorApi } from '../../core/services/api.service';
import { vi } from 'vitest';
const tutor: TutorApi = {
  id: 7,
  usuarioId: 8,
  nombre: 'Ana Pérez',
  biografia: 'Matemáticas',
  tarifaPorHora: 50000,
  disponible: true,
  materias: [{ id: 1, nombre: 'Cálculo' }],
  calificacion: 4.5,
};
describe('Catálogo y editor conectados', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TutoresPageComponent, TutorEditorComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).sesion.set({
      rol: 'ADMINISTRADOR',
      perfilId: 1,
      nombreUsuario: 'Admin',
    });
  });
  afterEach(() => http.verify());
  function pagina() {
    const f = TestBed.createComponent(TutoresPageComponent);
    f.detectChanges();
    http.expectOne('/api/tutores/materias').flush(tutor.materias);
    return f;
  }
  it('muestra espera real, datos paginados, filtro reinicia página y errores recuperables sin borrar datos', () => {
    const f = pagina();
    expect(f.nativeElement.textContent).toContain('Cargando tutores');
    http
      .expectOne('/api/tutores?page=0&size=5')
      .flush({ content: [tutor], number: 0, totalPages: 2, totalElements: 6 });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Ana Pérez');
    f.componentInstance.navegar(1);
    http
      .expectOne('/api/tutores?page=1&size=5')
      .flush({ mensaje: 'Caída' }, { status: 503, statusText: 'Unavailable' });
    expect(f.componentInstance.cargando()).toBe(false);
    expect(f.componentInstance.error()).toContain('No hay conexión');
    expect(f.componentInstance.pagina()?.content).toHaveLength(1);
    f.componentInstance.materiaId = '1';
    f.componentInstance.filtrar();
    http
      .expectOne('/api/tutores?page=0&size=5&materiaId=1')
      .flush({ content: [], number: 0, totalPages: 0, totalElements: 0 });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No hay tutores para estos filtros.');
    expect(f.componentInstance.error()).toBe('');
    f.destroy();
  });
  it('precarga editor, emite PUT desde $event, conserva borrador en 409 y actualiza tras éxito', () => {
    const f = pagina();
    http
      .expectOne('/api/tutores?page=0&size=5')
      .flush({ content: [tutor], number: 0, totalPages: 1, totalElements: 1 });
    f.componentInstance.seleccionar(7);
    http.expectOne('/api/tutores/7').flush(tutor);
    f.detectChanges();
    const editor = f.debugElement.children.flatMap((c) => c.children);
    expect(editor.length).toBeGreaterThan(0);
    const textarea = f.nativeElement.querySelector('textarea[formControlName="biografia"]');
    expect(textarea.value).toBe('Matemáticas');
    textarea.value = 'Nueva biografía';
    textarea.dispatchEvent(new Event('input'));
    f.nativeElement.querySelector('app-tutor-editor form').dispatchEvent(new Event('submit'));
    const put = http.expectOne('/api/tutores/7');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.biografia).toBe('Nueva biografía');
    put.flush({ mensaje: 'Conflicto de edición' }, { status: 409, statusText: 'Conflict' });
    f.detectChanges();
    expect(textarea.value).toBe('Nueva biografía');
    expect(f.componentInstance.guardando()).toBe(false);
    f.nativeElement.querySelector('app-tutor-editor form').dispatchEvent(new Event('submit'));
    http.expectOne('/api/tutores/7').flush({ ...tutor, biografia: 'Nueva biografía' });
    http
      .expectOne('/api/tutores?page=0&size=5')
      .flush({ content: [tutor], number: 0, totalPages: 1, totalElements: 1 });
    expect(f.componentInstance.seleccionado()).toBeNull();
    expect(f.componentInstance.cambios()).toBe(1);
    f.destroy();
  });
  it('valida required, min y maxlength; cancelar y cambiar selección no mutan el registro', async () => {
    const f = TestBed.createComponent(TutorEditorComponent);
    f.componentRef.setInput('tutor', tutor);
    f.detectChanges();
    const emit = vi.spyOn(f.componentInstance.guardado, 'emit');
    f.componentInstance.form.patchValue({ biografia: '', tarifaPorHora: 0 });
    f.componentInstance.guardar();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('biografía es obligatoria');
    expect(f.nativeElement.textContent).toContain('tarifa debe estar entre');
    expect(emit).not.toHaveBeenCalled();
    const campo = f.nativeElement.querySelector('textarea');
    campo.value = 'a'.repeat(2001);
    campo.dispatchEvent(new Event('input'));
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('2000 caracteres');
    f.componentInstance.cancelar();
    expect(f.componentInstance.form.controls.biografia.value).toBe(tutor.biografia);
    expect(tutor.biografia).toBe('Matemáticas');
    f.componentRef.setInput('tutor', { ...tutor, id: 9, biografia: 'Otro tutor' });
    f.detectChanges();
    expect(f.componentInstance.form.controls.biografia.value).toBe('Otro tutor');
    f.destroy();
  });
});
