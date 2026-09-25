import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SelectComponent, SelectOption } from './select';

@Component({
  imports: [SelectComponent],
  template: `
    <app-select
      id="subject-select"
      label="Materia"
      placeholder="Todas las materias"
      [options]="options"
      [required]="true"
      [disabled]="isDisabled()"
      [errorMessage]="error()"
      [(value)]="selectedValue"
    />
  `,
})
class TestHostComponent {
  readonly options: readonly SelectOption[] = [
    { label: 'Cálculo', value: 'calculo' },
    { label: 'Física', value: 'fisica' },
    { label: 'Programación', value: 'programacion', disabled: true },
  ];
  readonly selectedValue = signal('calculo');
  readonly isDisabled = signal(false);
  readonly error = signal<string | undefined>(undefined);
}

describe('SelectComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent, SelectComponent] }).compileComponents();
  });

  it('renders select with options and selects initial value', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    const label = fixture.nativeElement.querySelector('label');

    expect(label?.textContent).toContain('Materia');
    expect(select.value).toBe('calculo');
    expect(select.options.length).toBe(4); // placeholder + 3 options
  });

  it('updates model when selection changes', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'fisica';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedValue()).toBe('fisica');
  });

  it('displays error message when provided', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.error.set('Selecciona una materia válida');
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.form-error');
    expect(error?.textContent).toBe('Selecciona una materia válida');
  });

  it('disables select when disabled is true', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.isDisabled.set(true);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select');
    expect(select.disabled).toBe(true);
  });
});
