import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { MaskProfile } from '../mask-data';
import { MaskDataService } from '../mask-data.service';
import { FaceComfortHeatmap } from './face-comfort-heatmap';

interface TestCohortMask {
  slug: string;
  name: string;
}

export const HEATMAP_TEST_COHORT: readonly TestCohortMask[] = [
  { slug: 'resmed-airfit-p10', name: 'ResMed AirFit P10' },
  { slug: 'resmed-airfit-f20', name: 'ResMed AirFit F20' },
  { slug: 'resmed-airfit-n20', name: 'ResMed AirFit N20' },
  {
    slug: 'philips-respironics-comfortgel-blue-nasal',
    name: 'Philips Respironics ComfortGel Blue Nasal'
  },
  { slug: 'resmed-swift-fx', name: 'ResMed Swift FX' },
  { slug: 'resmed-quattro-fx', name: 'ResMed Quattro FX' },
  { slug: 'philips-respironics-nuance-pro', name: 'Philips Respironics Nuance Pro' },
  { slug: 'resmed-airfit-f40', name: 'ResMed AirFit F40' },
  { slug: 'resmed-swift-fx-bella-for-her', name: 'ResMed Swift FX Bella For Her' },
  { slug: 'circadiance-sleepweaver-advance', name: 'Circadiance SleepWeaver Advance' }
];

@Component({
  selector: 'app-comfort-heatmap-harness',
  imports: [RouterLink, FaceComfortHeatmap],
  templateUrl: './comfort-heatmap-harness.html',
  styleUrl: './comfort-heatmap-harness.css'
})
export class ComfortHeatmapHarness {
  protected readonly cohort = HEATMAP_TEST_COHORT;
  protected readonly selectedSlug = signal(HEATMAP_TEST_COHORT[0].slug);
  protected readonly profiles = signal(new Map<string, MaskProfile>());
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly selectedProfile = computed(() => this.profiles().get(this.selectedSlug()));

  constructor() {
    const maskData = inject(MaskDataService);
    forkJoin(
      HEATMAP_TEST_COHORT.map((mask) =>
        maskData.getProfile(mask.slug).pipe(catchError(() => of(null)))
      )
    ).subscribe((profiles) => {
      const loadedProfiles = profiles.filter((profile): profile is MaskProfile => profile !== null);
      this.profiles.set(new Map(loadedProfiles.map((profile) => [profile.slug, profile])));
      this.loadError.set(loadedProfiles.length === 0);
      this.loading.set(false);
    });
  }

  protected selectMask(event: Event): void {
    this.selectedSlug.set((event.target as HTMLSelectElement).value);
  }
}
