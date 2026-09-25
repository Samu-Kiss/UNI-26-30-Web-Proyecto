import { Component, input, model } from '@angular/core';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  template: `
    <div class="form-field" [class.form-field--error]="!!errorMessage()">
      @if (label()) {
        <label [for]="id()" class="form-label">
          {{ label() }}
          @if (required()) {
            <span aria-hidden="true" style="color: var(--color-danger)"> *</span>
          }
        </label>
      }

      <select
        [id]="id()"
        [name]="name() ?? id()"
        [disabled]="disabled()"
        [required]="required()"
        [value]="value()"
        [attr.aria-invalid]="!!errorMessage()"
        class="select-input"
        (change)="handleChange($event)"
      >
        @if (placeholder(); as ph) {
          <option value="" disabled [selected]="!value()">{{ ph }}</option>
        }
        @for (opt of options(); track opt.value) {
          <option [value]="opt.value" [disabled]="opt.disabled ?? false" [selected]="opt.value === value()">
            {{ opt.label }}
          </option>
        }
      </select>

      @if (errorMessage(); as error) {
        <span class="form-error" role="alert">{{ error }}</span>
      }
    </div>
  `,
})
export class SelectComponent {
  readonly label = input<string | undefined>(undefined);
  readonly options = input.required<readonly SelectOption[]>();
  readonly id = input<string>('select-' + Math.random().toString(36).substring(2, 9));
  readonly name = input<string | undefined>(undefined);
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly placeholder = input<string | undefined>(undefined);
  readonly errorMessage = input<string | undefined>(undefined);

  readonly value = model<string>('');

  handleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.value.set(target.value);
  }
}
