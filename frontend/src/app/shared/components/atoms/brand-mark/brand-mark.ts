import { Component } from '@angular/core';

@Component({
  selector: 'app-brand-mark',
  template: '<span aria-label="MyT">MyT</span>',
  styles: `
    :host {
      display: inline-block;
      color: var(--color-primary);
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.04em;
    }
  `,
})
export class BrandMarkComponent {}
