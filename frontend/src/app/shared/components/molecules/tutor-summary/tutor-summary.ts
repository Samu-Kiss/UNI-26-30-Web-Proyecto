import { Component, input } from '@angular/core';
import { Tutor } from '../../../../core/models/tutor.model';
import { AvatarComponent } from '../../atoms/avatar/avatar';
import { BadgeComponent } from '../../atoms/badge/badge';

@Component({
  imports: [AvatarComponent, BadgeComponent],
  selector: 'app-tutor-summary',
  templateUrl: './tutor-summary.html',
  styleUrl: './tutor-summary.css',
})
export class TutorSummaryComponent {
  readonly tutor = input.required<Tutor>();
}
