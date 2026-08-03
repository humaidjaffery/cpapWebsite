import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MaskIndexItem } from './mask-data';
import { MaskDataService } from './mask-data.service';

@Component({
  selector: 'app-cpapworld',
  imports: [RouterLink],
  templateUrl: './cpapworld.html',
  styleUrl: './cpapworld.css'
})
export class CpapWorld {
  protected readonly masks = signal<MaskIndexItem[]>([]);
  protected readonly catalogLoading = signal(true);
  protected readonly catalogError = signal(false);

  constructor(maskData: MaskDataService) {
    maskData.getIndex().subscribe({
      next: (index) => {
        this.masks.set([...index.masks].sort((a, b) => a.catalogOrder - b.catalogOrder));
        this.catalogLoading.set(false);
      },
      error: () => {
        this.catalogError.set(true);
        this.catalogLoading.set(false);
      }
    });
  }

  protected coverageLabel(mask: MaskIndexItem): string {
    if (mask.coverage.status === 'complete') {
      return `${mask.coverage.processedReviews.toLocaleString()} reviews analyzed`;
    }
    if (mask.coverage.status === 'preliminary') {
      return `${mask.coverage.processedReviews.toLocaleString()} of ${mask.coverage.eligibleReviews.toLocaleString()} analyzed`;
    }
    if (mask.coverage.status === 'unavailable') {
      return 'No eligible review evidence';
    }
    return 'Analysis in progress';
  }
}
