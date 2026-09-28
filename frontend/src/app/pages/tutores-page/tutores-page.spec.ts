import { TestBed } from '@angular/core/testing';
import { TutoresPageComponent, normalizeText } from './tutores-page';
import { TutorListComponent } from '../../shared/components/organisms/tutor-list/tutor-list';

describe('TutoresPageComponent', () => {
  it('renders the three temporary tutor records with Angular control flow', async () => {
    await TestBed.configureTestingModule({ imports: [TutoresPageComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TutoresPageComponent);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('Felipe Morales');
    expect(fixture.nativeElement.textContent).toContain('Elena Guerrero');
    expect(fixture.nativeElement.textContent).toContain('Mariana Rojas');
  });

  it('filters tutors by search query', async () => {
    await TestBed.configureTestingModule({ imports: [TutoresPageComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TutoresPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.searchQuery.set('elena');
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Elena Guerrero');
    expect(fixture.nativeElement.textContent).not.toContain('Felipe Morales');
  });

  it('filters tutors accent-insensitively', async () => {
    await TestBed.configureTestingModule({ imports: [TutoresPageComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TutoresPageComponent);
    fixture.detectChanges();

    // 'calculo' without accent should match 'Cálculo' (Felipe Morales)
    fixture.componentInstance.searchQuery.set('calculo');
    fixture.detectChanges();
    let rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Felipe Morales');

    // 'fisica' without accent should match 'Física' (Mariana Rojas)
    fixture.componentInstance.searchQuery.set('fisica');
    fixture.detectChanges();
    rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Mariana Rojas');

    // 'ALGEBRA' in uppercase without accent should match 'Álgebra lineal'
    fixture.componentInstance.searchQuery.set('ALGEBRA');
    fixture.detectChanges();
    rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Felipe Morales');
  });

  it('filters tutors by selected materia', async () => {
    await TestBed.configureTestingModule({ imports: [TutoresPageComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TutoresPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectedMateria.set('Física');
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Mariana Rojas');
  });

  it('renders the empty state when tutor list is empty', async () => {
    await TestBed.configureTestingModule({ imports: [TutorListComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TutorListComponent);
    fixture.componentRef.setInput('tutores', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay tutores registrados.');
  });

  it('normalizes diacritical characters correctly in helper function', () => {
    expect(normalizeText('Cálculo')).toBe('calculo');
    expect(normalizeText('ÁÉÍÓÚñ')).toBe('aeioun');
  });
});
