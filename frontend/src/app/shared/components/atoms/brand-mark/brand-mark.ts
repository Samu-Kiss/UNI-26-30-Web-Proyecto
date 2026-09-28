import { Component } from '@angular/core';

@Component({
  selector: 'app-brand-mark',
  template: '<span aria-label="MyT">MyT</span>',
  styles: `
    :host {
      display: inline-block;
      color: #196a54;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
  `,
})
export class BrandMarkComponent {}
