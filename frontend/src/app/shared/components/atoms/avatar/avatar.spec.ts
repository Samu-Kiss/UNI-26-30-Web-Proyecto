import { TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar';

describe('AvatarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AvatarComponent] }).compileComponents();
  });

  it('computes initials from a multi-word name', () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('name', 'Felipe Morales');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent?.trim()).toBe('FM');
    expect(fixture.nativeElement.querySelector('.avatar').classList.contains('avatar--md')).toBe(true);
  });

  it('computes initials from a single-word name', () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('name', 'Elena');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent?.trim()).toBe('EL');
  });

  it('defaults to ? when name is not provided or empty', () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent?.trim()).toBe('?');
  });

  it('uses explicitly provided initials over name', () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('name', 'Felipe Morales');
    fixture.componentRef.setInput('initials', 'XP');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent?.trim()).toBe('XP');
  });

  it('renders image when src is given', () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('src', 'https://example.com/avatar.jpg');
    fixture.componentRef.setInput('name', 'Juan Perez');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg');
    expect(img.getAttribute('alt')).toBe('Juan Perez');
  });

  it('applies specified size class', () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.avatar').classList.contains('avatar--lg')).toBe(true);
  });
});
