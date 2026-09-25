import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button';

describe('ButtonComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ButtonComponent] }).compileComponents();
  });

  it('creates the button with default props', () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn.classList.contains('btn--primary')).toBe(true);
    expect(btn.classList.contains('btn--md')).toBe(true);
    expect(btn.type).toBe('button');
    expect(btn.disabled).toBe(false);
  });

  it('applies variant, size and fullWidth inputs', () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('variant', 'danger');
    fixture.componentRef.setInput('size', 'lg');
    fixture.componentRef.setInput('fullWidth', true);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.classList.contains('btn--danger')).toBe(true);
    expect(btn.classList.contains('btn--lg')).toBe(true);
    expect(btn.classList.contains('btn--full')).toBe(true);
  });

  it('emits clicked event when clicked and not disabled', () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.detectChanges();

    let clickedEvent: MouseEvent | undefined;
    fixture.componentInstance.clicked.subscribe((e) => (clickedEvent = e));

    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    btn.click();

    expect(clickedEvent).toBeDefined();
  });

  it('does not emit clicked event when disabled', () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    let clickedEvent: MouseEvent | undefined;
    fixture.componentInstance.clicked.subscribe((e) => (clickedEvent = e));

    fixture.componentInstance.handleClick(new MouseEvent('click'));

    expect(clickedEvent).toBeUndefined();
  });

  it('sets aria-label attribute when provided', () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('ariaLabel', 'Cerrar ventana');
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.getAttribute('aria-label')).toBe('Cerrar ventana');
  });
});
