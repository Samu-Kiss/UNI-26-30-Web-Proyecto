import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Materia, TutorApi, TutorEdicion } from '../../../../core/services/api.service';
@Component({
  selector: 'app-tutor-editor',
  imports: [ReactiveFormsModule],
  template: `<form [formGroup]="form" (ngSubmit)="guardar()" class="laboratorio-form">
    <h2>Editar {{ tutor().nombre }}</h2>
    <fieldset [disabled]="ocupado()">
      <div class="myt-form-row-2">
        <label class="form-field"
          >Tarifa por hora
          <input class="text-input" type="number" formControlName="tarifaPorHora" />
        </label>
        <label class="form-field form-field--checkbox">
          <span class="form-field__checkbox-label">
            <input type="checkbox" formControlName="disponible" />
            Disponible para reservas
          </span>
        </label>
      </div>
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
      <div class="form-field">
        <span>Materias que impartes</span>
        @if (catalogoMaterias().length > 0) {
          <div class="myt-chips-wrap" role="group" aria-label="Materias del catálogo">
            @for (m of catalogoMaterias(); track m.id) {
              <button
                type="button"
                class="myt-pill-chip"
                [class.myt-pill-chip--active]="materiaSeleccionada(m.id)"
                [attr.aria-pressed]="materiaSeleccionada(m.id)"
                (click)="alternarMateria(m.id)"
              >
                {{ m.nombre }}
              </button>
            }
          </div>
        }
        <label class="form-field">
          <span class="form-hint"
            >También puedes escribir materias adicionales separadas por coma:</span
          >
          <input
            class="text-input"
            type="text"
            formControlName="materiasTexto"
            placeholder="Ej. Cálculo vectorial, Estadística, Programación web"
          />
        </label>
        @if (intentoGuardar() && !tieneMaterias()) {
          <p role="alert">Selecciona o escribe al menos una materia.</p>
        }
      </div>
      <label class="form-field"
        >Biografía
        <textarea class="text-input" rows="3" formControlName="biografia"></textarea>
      </label>
      @if (form.controls.biografia.touched && form.controls.biografia.hasError('required')) {
        <p role="alert">La biografía es obligatoria.</p>
      }
      @if (form.controls.biografia.touched && form.controls.biografia.hasError('maxlength')) {
        <p role="alert">La biografía no puede superar 2000 caracteres.</p>
      }
      <div class="myt-toolbar-actions">
        <button class="btn btn--primary btn--md" type="submit" [disabled]="form.invalid || ocupado()">
          Guardar cambios
        </button>
        <button class="btn btn--secondary btn--md" type="button" (click)="cancelar()">
          Cancelar
        </button>
      </div>
    </fieldset>
  </form>`,
})
export class TutorEditorComponent {
  readonly tutor = input.required<TutorApi>();
  readonly materiasDisponibles = input<Materia[]>([]);
  readonly ocupado = input(false);
  readonly guardado = output<TutorEdicion>();
  readonly cancelado = output<void>();
  readonly materiaIdsSeleccionados = signal<number[]>([]);
  readonly intentoGuardar = signal(false);
  readonly catalogoMaterias = computed(() => {
    const map = new Map<number, Materia>();
    for (const m of this.materiasDisponibles() ?? []) {
      map.set(m.id, m);
    }
    for (const m of this.tutor()?.materias ?? []) {
      if (!map.has(m.id)) {
        map.set(m.id, m);
      }
    }
    return Array.from(map.values());
  });
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
    materiasTexto: new FormControl('', { nonNullable: true }),
  });
  constructor() {
    effect(() => this.sincronizarFormulario(this.tutor()));
  }
  private sincronizarFormulario(t: TutorApi) {
    this.form.reset({
      biografia: t.biografia,
      tarifaPorHora: t.tarifaPorHora,
      disponible: t.disponible,
      materiasTexto: '',
    });
    this.materiaIdsSeleccionados.set((t.materias ?? []).map((m) => m.id));
    this.intentoGuardar.set(false);
  }
  materiaSeleccionada(id: number): boolean {
    return this.materiaIdsSeleccionados().includes(id);
  }
  alternarMateria(id: number): void {
    this.materiaIdsSeleccionados.update((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  }
  private materiasAdicionales(): string[] {
    const raw = this.form.controls.materiasTexto.value || '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 100);
  }
  tieneMaterias(): boolean {
    const tieneCatalogo = this.catalogoMaterias().length > 0 || (this.tutor().materias?.length ?? 0) > 0;
    if (!tieneCatalogo && this.materiasAdicionales().length === 0) {
      return true;
    }
    return this.materiaIdsSeleccionados().length > 0 || this.materiasAdicionales().length > 0;
  }
  guardar() {
    this.intentoGuardar.set(true);
    this.form.markAllAsTouched();
    if (!this.tieneMaterias()) return;
    if (this.form.valid && !this.ocupado()) {
      const raw = this.form.getRawValue();
      const adicionales = this.materiasAdicionales();
      const ids = this.materiaIdsSeleccionados();
      const payload: TutorEdicion = {
        biografia: raw.biografia,
        tarifaPorHora: raw.tarifaPorHora,
        disponible: raw.disponible,
        ...(ids.length > 0 ? { materiaIds: ids } : {}),
        ...(adicionales.length > 0 ? { nuevasMaterias: adicionales } : {}),
      };
      this.guardado.emit(payload);
    }
  }
  cancelar() {
    this.sincronizarFormulario(this.tutor());
    this.cancelado.emit();
  }
}
