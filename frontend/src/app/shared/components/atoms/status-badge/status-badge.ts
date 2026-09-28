import { Component, input } from '@angular/core';
import { BadgeComponent } from '../badge/badge';

@Component({
  imports: [BadgeComponent],
  selector: 'app-status-badge',
  template: `
    <app-badge [variant]="disponible() ? 'success' : 'danger'">
      {{ disponible() ? 'Disponible' : 'No disponible' }}
    </app-badge>
  `,
})
export class StatusBadgeComponent {
  readonly disponible = input.required<boolean>();
}
