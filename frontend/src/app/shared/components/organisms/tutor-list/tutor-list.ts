import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Tutor } from '../../../../core/models/tutor.model';
import { StatusBadgeComponent } from '../../atoms/status-badge/status-badge';
import { TutorSummaryComponent } from '../../molecules/tutor-summary/tutor-summary';

@Component({
  imports: [CurrencyPipe, DecimalPipe, StatusBadgeComponent, TutorSummaryComponent],
  selector: 'app-tutor-list',
  templateUrl: './tutor-list.html',
  styleUrl: './tutor-list.css',
})
export class TutorListComponent {
  readonly tutores = input.required<readonly Tutor[]>();
}
