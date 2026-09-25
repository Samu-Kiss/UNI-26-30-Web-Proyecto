import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TextFieldComponent } from './text-field';

@Component({
  imports: [TextFieldComponent],
  template: `
    <app-text-field
      id="test-input"
      label="Nombre de usuario"
      [required]="true"
      [disabled]="isDisabled()"
      [errorMessage]="error()"
      [hint]="hint()"
      [(value)]="textValue"
    />
  `,
})
class TestHostComponent {
  readonly textValue = signal('inicial');
  readonly isDisabled = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly hint = signal<string | undefined>('Ingresa tu nombre completo');
}

describe('TextFieldComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent, TextFieldComponent] }).compileComponents();
  });

  it('renders label, input and binds initial value', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('label');
    const input = fixture.nativeElement.querySelector('input');
    const hint = fixture.nativeElement.querySelector('.form-hint');

    expect(label?.textContent).toContain('Nombre de usuario');
    expect(label?.getAttribute('for')).toBe('test-input');
    expect(input?.value).toBe('inicial');
    expect(hint?.textContent).toBe('Ingresa tu nombre completo');
  });

  it('updates model value on input event', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'nuevo texto';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.textValue()).toBe('nuevo texto');
  });

  it('displays error message and sets aria-invalid when errorMessage is provided', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.error.set('Campo obligatorio');
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.form-error');
    const input = fixture.nativeElement.querySelector('input');

    expect(error?.textContent).toBe('Campo obligatorio');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('test-input-error');
    expect(fixture.nativeElement.querySelector('.form-hint')).toBeNull();
  });

  it('disables the input when disabled input is true', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.isDisabled.set(true);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input');
    expect(input.disabled).toBe(true);
  });
});
