import { TestBed } from '@angular/core/testing';
import { TutoresPageComponent } from './tutores-page';
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

  it('renders the empty state when tutor list is empty', async () => {
    await TestBed.configureTestingModule({ imports: [TutorListComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TutorListComponent);
    fixture.componentRef.setInput('tutores', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay tutores registrados.');
  });
});
