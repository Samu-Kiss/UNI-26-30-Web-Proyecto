import { Component } from '@angular/core';
import { Tutor } from '../../core/models/tutor.model';
import { BrandMarkComponent } from '../../shared/components/atoms/brand-mark/brand-mark.component';
import { TutorListComponent } from '../../shared/components/organisms/tutor-list/tutor-list.component';

@Component({
  imports: [BrandMarkComponent, TutorListComponent],
  selector: 'app-tutores-page',
  templateUrl: './tutores-page.component.html',
  styleUrl: './tutores-page.component.css',
})
export class TutoresPageComponent {
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
}
