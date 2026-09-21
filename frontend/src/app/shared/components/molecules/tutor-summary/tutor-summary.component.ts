import { Component, input } from '@angular/core';
import { Tutor } from '../../../../core/models/tutor.model';

@Component({
  selector: 'app-tutor-summary',
  templateUrl: './tutor-summary.component.html',
  styleUrl: './tutor-summary.component.css',
})
export class TutorSummaryComponent {
  readonly tutor = input.required<Tutor>();

  protected initials(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('');
  }
}
