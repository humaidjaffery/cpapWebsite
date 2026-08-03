import { Component, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, forkJoin, map, switchMap } from 'rxjs';

import { ContextFinding, MaskPrices, MaskProfile, MetricFinding } from '../mask-data';
import { MaskDataService } from '../mask-data.service';

@Component({
  selector: 'app-mask-detail',
  imports: [RouterLink],
  templateUrl: './mask-detail.html',
  styleUrl: './mask-detail.css'
})
export class MaskDetail {
  protected readonly profile = signal<MaskProfile | null>(null);
  protected readonly prices = signal<MaskPrices | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly bestFor = computed(() => this.contextsByIds(this.profile()?.bestFor ?? []));
  protected readonly mayNotSuit = computed(() =>
    this.contextsByIds(this.profile()?.mayNotSuit ?? [])
  );
  protected readonly mixedContexts = computed(
    () => this.profile()?.contexts.filter((context) => context.classification === 'mixed') ?? []
  );
  protected readonly recentPriceHistory = computed(
    () => this.prices()?.priceHistory.slice(-30).reverse() ?? []
  );

  constructor(route: ActivatedRoute, maskData: MaskDataService) {
    route.paramMap
      .pipe(
        map((params) => params.get('maskSlug') ?? ''),
        distinctUntilChanged(),
        switchMap((slug) => {
          this.loading.set(true);
          this.loadError.set(false);
          this.profile.set(null);
          this.prices.set(null);
          return forkJoin({
            profile: maskData.getProfile(slug),
            prices: maskData.getPrices(slug)
          });
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: ({ profile, prices }) => {
          this.profile.set(profile);
          this.prices.set(prices);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        }
      });
  }

  protected hasAnalysis(profile: MaskProfile): boolean {
    return profile.coverage.processedReviews > 0;
  }

  protected formatCount(value: number): string {
    return value.toLocaleString();
  }

  protected formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  protected formatScore(value: number | null): string {
    return value === null ? '—' : String(value);
  }

  protected formatChecked(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
  }

  protected statusLabel(profile: MaskProfile): string {
    const labels = {
      complete: 'Complete analysis',
      preliminary: 'Preliminary analysis',
      pending: 'Analysis in progress',
      unavailable: 'Insufficient review evidence'
    };
    return labels[profile.coverage.status];
  }

  protected contextDescription(context: ContextFinding): string {
    if (context.classification === 'favorable') {
      return 'Reviewers in this context reported predominantly favorable experiences.';
    }
    if (context.classification === 'unfavorable') {
      return 'Reviewers in this context reported predominantly unfavorable experiences.';
    }
    return context.limitedEvidence
      ? 'Early evidence is limited and not strong enough for a recommendation.'
      : 'Reviewers reported a mix of positive and negative experiences.';
  }

  protected signalEvidence(finding: MetricFinding, positive: boolean): string | null {
    const evidence = positive ? finding.positiveEvidence : finding.negativeEvidence;
    return evidence[0]?.text ?? null;
  }

  private contextsByIds(ids: string[]): ContextFinding[] {
    const wanted = new Set(ids);
    return this.profile()?.contexts.filter((context) => wanted.has(context.id)) ?? [];
  }
}
