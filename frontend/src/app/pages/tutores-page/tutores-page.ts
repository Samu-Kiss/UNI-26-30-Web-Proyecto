import { Component, computed, signal } from '@angular/core';
import { Tutor } from '../../core/models/tutor.model';
import { BrandMarkComponent } from '../../shared/components/atoms/brand-mark/brand-mark';
import { SelectComponent, SelectOption } from '../../shared/components/atoms/select/select';
import { TextFieldComponent } from '../../shared/components/atoms/text-field/text-field';
import { TutorListComponent } from '../../shared/components/organisms/tutor-list/tutor-list';

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Component({
  imports: [BrandMarkComponent, TextFieldComponent, SelectComponent, TutorListComponent],
  selector: 'app-tutores-page',
  templateUrl: './tutores-page.html',
  styleUrl: './tutores-page.css',
})
export class TutoresPageComponent {
  readonly searchQuery = signal('');
  readonly selectedMateria = signal('');

  protected readonly tutores: readonly Tutor[] = [
    {
      id: 1,
      nombreCompleto: 'Felipe Morales',
      materias: ['Cálculo', 'Álgebra lineal'],
      tarifaPorHora: 45000,
      calificacion: 4.9,
      disponible: true,
    },
    {
      id: 2,
      nombreCompleto: 'Elena Guerrero',
      materias: ['Programación', 'Bases de datos'],
      tarifaPorHora: 52000,
      calificacion: 4.8,
      disponible: true,
    },
    {
      id: 3,
      nombreCompleto: 'Mariana Rojas',
      materias: ['Física', 'Estadística'],
      tarifaPorHora: 40000,
      calificacion: 4.7,
      disponible: false,
    },
  ];

  readonly materiaOptions = computed<readonly SelectOption[]>(() => {
    const set = new Set<string>();
    for (const tutor of this.tutores) {
      for (const m of tutor.materias) {
        set.add(m);
      }
    }
    const options: SelectOption[] = [{ label: 'Todas las materias', value: '' }];
    for (const m of Array.from(set).sort()) {
      options.push({ label: m, value: m });
    }
    return options;
  });

  readonly filteredTutores = computed<readonly Tutor[]>(() => {
    const q = normalizeText(this.searchQuery());
    const materia = this.selectedMateria();

    return this.tutores.filter((tutor) => {
      const matchesQuery =
        !q ||
        normalizeText(tutor.nombreCompleto).includes(q) ||
        tutor.materias.some((m) => normalizeText(m).includes(q));

      const matchesMateria = !materia || tutor.materias.includes(materia);

      return matchesQuery && matchesMateria;
    });
  });
}
