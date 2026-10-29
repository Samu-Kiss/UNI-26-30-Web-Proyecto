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
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  function pagina() {
    const f = TestBed.createComponent(TutoresPageComponent);
    f.detectChanges();
    http.expectOne('/api/tutores/materias').flush(tutor.materias);
    return f;
  }
  it('crea un tutor una sola vez, conserva el borrador ante errores y refresca al reintentar', () => {
    const f = pagina();
    const c = f.componentInstance;
    http.expectOne('/api/tutores?page=0&size=6').flush({ content: [], totalPages: 0 });
    c.usuarioId = 8;
    c.biografia = 'Clases de cálculo';
    c.tarifa = 50000;
    c.nuevaMateria = 1;
    c.crear();
    c.crear();
    const req = http.expectOne('/api/tutores');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      usuarioId: 8,
      biografia: 'Clases de cálculo',
      tarifaPorHora: 50000,
      materiaIds: [1],
    });
    req.flush({}, { status: 403, statusText: 'Forbidden' });
    expect(c.guardando()).toBe(false);
    expect(c.biografia).toBe('Clases de cálculo');
    expect(c.error()).toContain('no tiene permiso');
    c.crear();
    http.expectOne('/api/tutores').flush(tutor);
    http.expectOne('/api/tutores?page=0&size=6').flush({ content: [tutor], totalPages: 1 });
    expect(c.biografia).toBe('');
    expect(c.cambios()).toBe(1);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Ana Pérez');
    f.destroy();
  });

  it('desactiva solo con confirmación, evita duplicados y permite reintentar un fallo', () => {
    const f = pagina();
    const c = f.componentInstance;
    http.expectOne('/api/tutores?page=0&size=6').flush({ content: [tutor], totalPages: 1 });
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    c.desactivar(tutor);
    http.expectNone('/api/tutores/7');
    confirmar.mockReturnValue(true);
    c.desactivar(tutor);
    c.desactivar(tutor);
    const req = http.expectOne('/api/tutores/7');
    expect(req.request.method).toBe('DELETE');
    req.flush({}, { status: 500, statusText: 'Error' });
    expect(c.guardando()).toBe(false);
    expect(c.pagina()?.content).toEqual([tutor]);
    c.desactivar(tutor);
    http.expectOne('/api/tutores/7').flush(null);
    http.expectOne('/api/tutores?page=0&size=6').flush({ content: [], totalPages: 0 });
    expect(c.cambios()).toBe(1);
    expect(c.error()).toBe('');
    f.destroy();
  });

  it('recupera una selección fallida y no guarda sin tutor o durante otra petición', () => {
    const f = pagina();
    const c = f.componentInstance;
    http.expectOne('/api/tutores?page=0&size=6').flush({ content: [tutor], totalPages: 1 });
    c.guardar(tutor);
    http.expectNone('/api/tutores/7');
    c.seleccionar(7);
    c.seleccionar(7);
    c.guardar(tutor);
    http.expectOne('/api/tutores/7').flush({}, { status: 404, statusText: 'Not found' });
    expect(c.seleccionado()).toBeNull();
    expect(c.guardando()).toBe(false);
    expect(c.error()).not.toBe('');
    c.seleccionar(7);
    http.expectOne('/api/tutores/7').flush(tutor);
    expect(c.seleccionado()).toEqual(tutor);
    f.destroy();
  });

  it('retrocede si la última página queda vacía y filtra categorías conocidas', () => {
    const f = pagina();
    const c = f.componentInstance;
    http.expectOne('/api/tutores?page=0&size=6').flush({ content: [tutor], totalPages: 2 });
    c.navegar(1);
    http.expectOne('/api/tutores?page=1&size=6').flush({ content: [], totalPages: 1 });
    http.expectOne('/api/tutores?page=0&size=6').flush({ content: [tutor], totalPages: 1 });
    expect(c.page).toBe(0);
    c.materias.set([{ id: 2, nombre: 'Matemáticas' }]);
    c.seleccionarCategoriaChip('Matemáticas');
    http.expectOne('/api/tutores?page=0&size=6&materiaId=2').flush({ content: [], totalPages: 0 });
    c.seleccionarCategoriaChip('Diseño');
    http.expectNone((r) => r.url === '/api/tutores');
    c.seleccionarCategoriaChip('Todas');
    http.expectOne('/api/tutores?page=0&size=6').flush({ content: [tutor], totalPages: 1 });
    expect(c.materiaId).toBe('');
    f.destroy();
  });

  it('busca sin tildes y ordena por precio sin modificar la página original', () => {
    const f = TestBed.createComponent(TutoresPageComponent);
    const c = f.componentInstance;
    const otro = { ...tutor, id: 9, nombre: 'Luis', tarifaPorHora: 20000, calificacion: null };
    c.busquedaTexto = 'calculo';
    c.pagina.set({ content: [tutor, otro], number: 0, totalElements: 2, totalPages: 1 });
    expect(c.tutoresMostrados().map((t) => t.id)).toEqual([7, 9]);
    c.alternarOrden();
    expect(c.tutoresMostrados().map((t) => t.id)).toEqual([9, 7]);
    expect(c.pagina()?.content.map((t) => t.id)).toEqual([7, 9]);
    c.busquedaTexto = 'ANA';
    c.alternarOrden();
    expect(c.tutoresMostrados()).toEqual([tutor]);
    c.auth.sesion.set({ rol: 'TUTOR', perfilId: 7, nombreUsuario: 'Ana' });
    expect(c.editable(tutor)).toBe(true);
    expect(c.editable(otro)).toBe(false);
    c.auth.sesion.set(null);
    expect(c.editable(tutor)).toBe(false);
    f.destroy();
  });
  it('muestra espera real, datos paginados, filtro reinicia página y errores recuperables sin borrar datos', () => {
    const f = pagina();
    expect(f.nativeElement.textContent).toContain('Cargando tutores');
    http
      .expectOne('/api/tutores?page=0&size=6')
      .flush({ content: [tutor], number: 0, totalPages: 2, totalElements: 6 });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Ana Pérez');
    f.componentInstance.navegar(1);
    http
      .expectOne('/api/tutores?page=1&size=6')
      .flush({ mensaje: 'Caída' }, { status: 503, statusText: 'Unavailable' });
    expect(f.componentInstance.cargando()).toBe(false);
    expect(f.componentInstance.error()).toContain('No hay conexión');
    expect(f.componentInstance.pagina()?.content).toHaveLength(1);
    f.componentInstance.materiaId = '1';
    f.componentInstance.filtrar();
    http
      .expectOne('/api/tutores?page=0&size=6&materiaId=1')
      .flush({ content: [], number: 0, totalPages: 0, totalElements: 0 });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No hay tutores para estos filtros.');
    expect(f.componentInstance.error()).toBe('');
    f.destroy();
  });
  it('precarga editor, emite PUT desde $event, conserva borrador en 409 y actualiza tras éxito', () => {
    const f = pagina();
    http
      .expectOne('/api/tutores?page=0&size=6')
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
      .expectOne('/api/tutores?page=0&size=6')
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
