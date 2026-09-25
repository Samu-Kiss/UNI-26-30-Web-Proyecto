import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CardComponent } from './card';

@Component({
  imports: [CardComponent],
  template: `
    <app-card>
      <div card-header class="header">Cabecera</div>
      <p class="body">Cuerpo de la tarjeta</p>
      <div card-footer class="footer">Pie de página</div>
    </app-card>
  `,
})
class TestHostComponent {}

describe('CardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
  });

  it('renders card container with projected slots', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('section.card');
    expect(card).toBeTruthy();
    expect(card.querySelector('.header')?.textContent).toBe('Cabecera');
    expect(card.querySelector('.body')?.textContent).toBe('Cuerpo de la tarjeta');
    expect(card.querySelector('.footer')?.textContent).toBe('Pie de página');
  });
});
