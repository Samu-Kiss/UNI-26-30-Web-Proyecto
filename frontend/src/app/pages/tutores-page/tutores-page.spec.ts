import { TestBed } from '@angular/core/testing';
import { TutoresPageComponent } from './tutores-page';

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
});
