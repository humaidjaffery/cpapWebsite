import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RetailerIndex, RetailerProfile } from '../retailer-data';
import { RetailerDataService } from '../retailer-data.service';
import { WaitlistSignup } from '../../waitlist-signup/waitlist-signup';

@Component({
  selector: 'app-retailers',
  imports: [RouterLink, WaitlistSignup],
  templateUrl: './retailers.html',
  styleUrl: './retailers.css'
})
export class Retailers {
  protected readonly profiles = signal<RetailerProfile[]>([]);
  protected readonly methodology = signal<RetailerIndex['methodology'] | null>(null);
  protected readonly verifiedOn = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly serviceReviewTotal = computed(() =>
    this.profiles().reduce((total, profile) => total + profile.reviewEvidence.serviceClaimReviewCount, 0)
  );

  constructor(retailerData: RetailerDataService) {
    retailerData.getIndex().subscribe({
      next: (index) => {
        this.profiles.set([...index.profiles].sort((a, b) => a.name.localeCompare(b.name)));
        this.methodology.set(index.methodology);
        this.verifiedOn.set(index.verifiedOn);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }

  protected formatNumber(value: number): string {
    return value.toLocaleString();
  }

  protected formatRating(value: number | null): string {
    return value === null ? '—' : value.toFixed(2);
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return 'Not available';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(`${value}T00:00:00`));
  }

  protected gradeBand(grade: string | null): 'high' | 'middle' | 'low' | 'none' {
    if (!grade) {
      return 'none';
    }
    if (grade.startsWith('A') || grade.startsWith('B')) {
      return 'high';
    }
    if (grade.startsWith('C') || grade.startsWith('D')) {
      return 'middle';
    }
    return 'low';
  }

  protected scrollTo(sectionId: string, event: Event): void {
    event.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ block: 'start' });
    history.replaceState(null, '', `/cpapworld/retailers#${sectionId}`);
  }
}
