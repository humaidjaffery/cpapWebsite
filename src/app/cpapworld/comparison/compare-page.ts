import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';

import { WaitlistSignup } from '../../waitlist-signup/waitlist-signup';
import { MaskPrices, MaskProfile, RetailerPriceOffer } from '../mask-data';
import { MaskDataService } from '../mask-data.service';
import {
  buildMaskComparison,
  COMPARISON_RULES_VERSION,
  DEFAULT_COMPARISON_CRITERIA,
  describePriceConfiguration,
  MaskComparisonModel
} from './comparison-model';
import { ComparisonSummary, ComparisonSummaryService } from './comparison-summary.service';

type LoadedComparison = {
  leftProfile: MaskProfile;
  leftPrices: MaskPrices | null;
  rightProfile: MaskProfile;
  rightPrices: MaskPrices | null;
};

type ProductOverview = {
  rating: number | null;
  ratingCount: number;
  offer: RetailerPriceOffer | null;
  headgearIncluded: boolean;
};

@Component({
  selector: 'app-compare-page',
  imports: [RouterLink, WaitlistSignup],
  templateUrl: './compare-page.html',
  styleUrl: './compare-page.css'
})
export class ComparePage {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly model = signal<MaskComparisonModel | null>(null);
  protected readonly includeHeadgear = signal(true);
  protected readonly productOverviews = signal<{
    left: ProductOverview;
    right: ProductOverview;
  } | null>(null);
  protected readonly summaryState = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  protected readonly summary = signal<ComparisonSummary | null>(null);
  protected readonly visibleCriteria = computed(() => {
    const model = this.model();
    if (!model) return [];
    return DEFAULT_COMPARISON_CRITERIA.flatMap((id) => {
      const row = model.criteria.find((criterion) => criterion.id === id);
      return row ? [row] : [];
    });
  });
  private loaded: LoadedComparison | null = null;
  private summaryRequestId = 0;

  constructor(
    route: ActivatedRoute,
    maskData: MaskDataService,
    private readonly summaries: ComparisonSummaryService
  ) {
    route.queryParamMap
      .pipe(
        map((params) => ({ mask1: params.get('mask1') ?? '', mask2: params.get('mask2') ?? '' })),
        distinctUntilChanged(
          (previous, current) =>
            previous.mask1 === current.mask1 && previous.mask2 === current.mask2
        ),
        switchMap(({ mask1, mask2 }) => {
          this.reset();
          if (!this.validSlug(mask1) || !this.validSlug(mask2) || mask1 === mask2) {
            this.loading.set(false);
            this.error.set('Choose two different masks to create a comparison.');
            return of(null);
          }
          return forkJoin({
            leftProfile: maskData.getProfile(mask1),
            leftPrices: maskData.getPrices(mask1),
            rightProfile: maskData.getProfile(mask2),
            rightPrices: maskData.getPrices(mask2)
          }).pipe(
            catchError(() => {
              this.loading.set(false);
              this.error.set('One or both masks could not be found. Choose two masks from the library.');
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((loaded) => {
        if (!loaded) return;
        this.loaded = loaded;
        this.productOverviews.set({
          left: this.productOverview(loaded.leftProfile, loaded.leftPrices),
          right: this.productOverview(loaded.rightProfile, loaded.rightPrices)
        });
        this.rebuildModel();
        this.loading.set(false);
        const model = this.model();
        if (model?.eligibility.eligible) {
          this.requestSummary(loaded.leftProfile.slug, loaded.rightProfile.slug);
        }
      });
  }

  protected toggleHeadgear(event: Event): void {
    this.includeHeadgear.set((event.target as HTMLInputElement).checked);
    this.rebuildModel();
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  protected formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  protected formatSeverity(value: number): string {
    return `${Math.round(value)}%`;
  }

  protected readonly describePriceConfiguration = describePriceConfiguration;

  protected formatRating(value: number | null): string {
    return value === null ? 'Not rated' : value.toFixed(1);
  }

  private requestSummary(mask1: string, mask2: string): void {
    const requestId = ++this.summaryRequestId;
    this.summaryState.set('loading');
    this.summaries
      .getSummary(mask1, mask2, COMPARISON_RULES_VERSION)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          if (requestId === this.summaryRequestId) this.summaryState.set('error');
          return of(null);
        })
      )
      .subscribe((result) => {
        if (!result || requestId !== this.summaryRequestId) return;
        this.summary.set(result.summary);
        this.summaryState.set('ready');
      });
  }

  private rebuildModel(): void {
    if (!this.loaded) return;
    this.model.set(
      buildMaskComparison(
        this.loaded.leftProfile,
        this.loaded.leftPrices,
        this.loaded.rightProfile,
        this.loaded.rightPrices,
        { includeHeadgear: this.includeHeadgear() }
      )
    );
  }

  private reset(): void {
    this.summaryRequestId += 1;
    this.loading.set(true);
    this.error.set('');
    this.model.set(null);
    this.productOverviews.set(null);
    this.loaded = null;
    this.includeHeadgear.set(true);
    this.summary.set(null);
    this.summaryState.set('idle');
  }

  private validSlug(slug: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }

  private productOverview(profile: MaskProfile, prices: MaskPrices | null): ProductOverview {
    const availableOffers = [...(prices?.offers ?? [])]
      .filter((offer) => offer.inStock)
      .sort(
        (left, right) =>
          left.priceCents - right.priceCents || left.retailer.localeCompare(right.retailer)
      );
    const offer =
      availableOffers.find((candidate) => candidate.configuration.headgearIncluded === true) ??
      availableOffers[0] ??
      null;

    return {
      rating: profile.overall.ratingComponent.average ?? null,
      ratingCount: profile.overall.ratingComponent.reviewCount,
      offer,
      headgearIncluded: offer?.configuration.headgearIncluded === true
    };
  }
}
