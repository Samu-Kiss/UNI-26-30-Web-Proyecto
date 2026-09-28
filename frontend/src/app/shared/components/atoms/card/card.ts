import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `
    <section class="card">
      <ng-content select="[card-header]" />
      <ng-content />
      <ng-content select="[card-footer]" />
    </section>
  `,
})
export class CardComponent {}
