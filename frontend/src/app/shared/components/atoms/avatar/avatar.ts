import { Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-avatar',
  template: `
    <div
      class="avatar avatar--{{ size() }}"
      [attr.aria-label]="name() ? 'Avatar de ' + name() : undefined"
      [attr.role]="name() ? 'img' : undefined"
    >
      @if (src()) {
        <img [src]="src()" [alt]="name() ?? 'Avatar'" />
      } @else {
        <span aria-hidden="true">{{ computedInitials() }}</span>
      }
    </div>
  `,
})
export class AvatarComponent {
  readonly name = input<string | undefined>(undefined);
  readonly initials = input<string | undefined>(undefined);
  readonly src = input<string | undefined>(undefined);
  readonly size = input<AvatarSize>('md');

  readonly computedInitials = computed(() => {
    if (this.initials()) {
      return this.initials()!;
    }
    const n = this.name()?.trim();
    if (!n) return '?';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });
}
