import { Component, input } from '@angular/core';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

@Component({
  selector: 'app-badge',
  template: `
    <span class="badge badge--{{ variant() }}">
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('neutral');
}
