import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TutorApi, TutorEdicion } from '../../../../core/services/api.service';
@Component({
  selector: 'app-tutor-editor',
  imports: [ReactiveFormsModule],
  template: `<form [formGroup]="form" (ngSubmit)="guardar()" class="laboratorio-form">
    <h2>Editar {{ tutor().nombre }}</h2>
    <fieldset [disabled]="ocupado()">
      <label class="form-field"
        >Biografía
        <textarea class="text-input" formControlName="biografia"></textarea>
      </label>
      @if (form.controls.biografia.touched && form.controls.biografia.hasError('required')) {
        <p role="alert">La biografía es obligatoria.</p>
      }
      @if (form.controls.biografia.touched && form.controls.biografia.hasError('maxlength')) {
        <p role="alert">La biografía no puede superar 2000 caracteres.</p>
      }
      <label class="form-field"
        >Tarifa por hora
        <input class="text-input" type="number" formControlName="tarifaPorHora" />
      </label>
      @if (
        form.controls.tarifaPorHora.touched && form.controls.tarifaPorHora.hasError('required')
      ) {
        <p role="alert">La tarifa es obligatoria.</p>
      }
      @if (
        form.controls.tarifaPorHora.touched &&
        (form.controls.tarifaPorHora.hasError('min') || form.controls.tarifaPorHora.hasError('max'))
      ) {
        <p role="alert">La tarifa debe estar entre 1 y 9999999999.99.</p>
      }
      <label><input type="checkbox" formControlName="disponible" /> Disponible para reservas</label>
      <button class="btn btn--primary btn--md" type="submit" [disabled]="form.invalid || ocupado()">
        Guardar cambios
      </button>
      <button class="btn btn--secondary btn--md" type="button" (click)="cancelar()">
        Cancelar
      </button>
    </fieldset>
  </form>`,
})
export class TutorEditorComponent {
  readonly tutor = input.required<TutorApi>();
  readonly ocupado = input(false);
  readonly guardado = output<TutorEdicion>();
  readonly cancelado = output<void>();
  readonly form = new FormGroup({
    biografia: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(2000)],
    }),
    tarifaPorHora: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(9999999999.99)],
    }),
    disponible: new FormControl(true, { nonNullable: true }),
  });
  constructor() {
    effect(() => this.form.reset({ ...this.tutor() }));
  }
  guardar() {
    this.form.markAllAsTouched();
    if (this.form.valid && !this.ocupado()) this.guardado.emit(this.form.getRawValue());
  }
  cancelar() {
    this.form.reset({ ...this.tutor() });
    this.cancelado.emit();
  }
}
