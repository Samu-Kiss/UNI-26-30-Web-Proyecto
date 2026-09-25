import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-text-field',
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

      <input
        [id]="id()"
        [name]="name() ?? id()"
        [type]="type()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [required]="required()"
        [value]="value()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-invalid]="!!errorMessage()"
        [attr.aria-describedby]="errorMessage() ? id() + '-error' : hint() ? id() + '-hint' : null"
        class="text-input"
        (input)="handleInput($event)"
      />

      @if (errorMessage(); as error) {
        <span [id]="id() + '-error'" class="form-error" role="alert">{{ error }}</span>
      } @else if (hint(); as text) {
        <span [id]="id() + '-hint'" class="form-hint">{{ text }}</span>
      }
    </div>
  `,
})
export class TextFieldComponent {
  readonly label = input<string | undefined>(undefined);
  readonly placeholder = input<string>('');
  readonly type = input<string>('text');
  readonly id = input<string>('field-' + Math.random().toString(36).substring(2, 9));
  readonly name = input<string | undefined>(undefined);
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly hint = input<string | undefined>(undefined);
  readonly errorMessage = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);

  readonly value = model<string>('');

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
  }
}
