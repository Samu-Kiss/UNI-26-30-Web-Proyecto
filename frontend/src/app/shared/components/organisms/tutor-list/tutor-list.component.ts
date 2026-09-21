import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Tutor } from '../../../../core/models/tutor.model';
import { StatusBadgeComponent } from '../../atoms/status-badge/status-badge.component';
import { TutorSummaryComponent } from '../../molecules/tutor-summary/tutor-summary.component';

@Component({
  imports: [CurrencyPipe, DecimalPipe, StatusBadgeComponent, TutorSummaryComponent],
  selector: 'app-tutor-list',
  templateUrl: './tutor-list.component.html',
  styleUrl: './tutor-list.component.css',
})
export class TutorListComponent {
  readonly tutores = input.required<readonly Tutor[]>();
}
