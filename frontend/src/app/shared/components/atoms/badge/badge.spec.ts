import { TestBed } from '@angular/core/testing';
import { BadgeComponent } from './badge';

describe('BadgeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BadgeComponent] }).compileComponents();
  });

  it('creates the badge with default neutral variant', () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('span');
    expect(span).toBeTruthy();
    expect(span.classList.contains('badge--neutral')).toBe(true);
  });

  it('applies specified variant class', () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentRef.setInput('variant', 'success');
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('span');
    expect(span.classList.contains('badge--success')).toBe(true);
  });
});
