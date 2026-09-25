import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="estado" [class.estado--disponible]="disponible()">
      {{ disponible() ? 'Disponible' : 'No disponible' }}
    </span>
  `,
  styles: `
    .estado {
      display: inline-flex;
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      color: #8a3f3f;
      background: #fde8e8;
      font-size: 0.82rem;
      font-weight: 750;
      white-space: nowrap;
    }

    .estado--disponible {
      color: #176b52;
      background: #dcf8ed;
    }
  `,
})
export class StatusBadgeComponent {
  readonly disponible = input.required<boolean>();
}
