import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ComparisonSelectionService } from './comparison-selection.service';

@Component({
  selector: 'app-comparison-controls',
  imports: [RouterLink],
  templateUrl: './comparison-controls.html',
  styleUrl: './comparison-controls.css'
})
export class ComparisonControls {
  protected readonly selection = inject(ComparisonSelectionService);
}
