import { Component, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';

import {
  ContextFinding,
  EvidenceExcerpt,
  InteractionInsight,
  MaskGallery,
  MaskGalleryImage,
  MaskPrices,
  MaskProfile,
  MetricFinding,
  PartFinding,
  RetailerPriceOffer
} from '../mask-data';
import { MaskDataService } from '../mask-data.service';
import { RetailerProfile, RetailerServiceAspect } from '../retailer-data';
import { RetailerDataService } from '../retailer-data.service';
import { CustomMaskPopup } from '../../custom-mask-popup/custom-mask-popup';
import { WaitlistSignup } from '../../waitlist-signup/waitlist-signup';

type AnalysisTab = 'overview' | 'reviews' | 'fit' | 'components';
type EvidenceTone = 'positive' | 'negative';
type ScoreEvidence = EvidenceExcerpt & { tone: EvidenceTone };
type ReviewEvidence = ScoreEvidence & { aspectId: string; aspectLabel: string };

@Component({
  selector: 'app-mask-detail',
  imports: [RouterLink, CustomMaskPopup, WaitlistSignup],
  templateUrl: './mask-detail.html',
  styleUrl: './mask-detail.css'
})
export class MaskDetail {
  private static readonly TOP_GRADE_IDS = [
    'fit-and-sizing',
    'comfort',
    'seal-and-leaks',
    'stability',
    'ease-of-use',
    'airflow-and-noise'
  ];
  private static readonly RETAILER_GRADE_IDS = [
    'service',
    'shipping',
    'price',
    'customer_support',
    'ordering',
    'return_policy'
  ];
  protected readonly profile = signal<MaskProfile | null>(null);
  protected readonly prices = signal<MaskPrices | null>(null);
  protected readonly gallery = signal<MaskGallery | null>(null);
  protected readonly retailerProfiles = signal(new Map<string, RetailerProfile>());
  protected readonly selectedOffer = signal<RetailerPriceOffer | null>(null);
  protected readonly selectedRetailer = signal<RetailerProfile | null>(null);
  protected readonly selectedSize = signal('all');
  protected readonly headgearIncluded = signal(true);
  protected readonly selectedPriceOptions = signal<Record<string, string>>({});
  protected readonly activeImageIndex = signal(0);
  protected readonly activeAnalysisTab = signal<AnalysisTab>('overview');
  protected readonly showAllComponents = signal(false);
  protected readonly expandedScoreEvidence = signal(new Set<string>());
  protected readonly selectedReviewAspect = signal('all');
  protected readonly showAllReviewAspects = signal(false);
  protected readonly reviewPage = signal(1);
  protected readonly reviewPageSize = 50;
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly availablePriceSizes = computed(() => {
    const sizes = new Set(
      (this.prices()?.offers ?? [])
        .filter(
          (offer) =>
            offer.configuration.headgearIncluded === this.headgearIncluded() &&
            offer.configuration.size
        )
        .map((offer) => offer.configuration.size as string)
    );
    return [...sizes]
      .filter((size) => size !== 'One Size')
      .sort((left, right) => this.priceSizeRank(left) - this.priceSizeRank(right));
  });
  protected readonly priceOptionDimensions = computed(() => {
    const values = new Map<string, Set<string>>();
    for (const offer of this.prices()?.offers ?? []) {
      if (offer.configuration.headgearIncluded !== this.headgearIncluded()) continue;
      if (this.selectedSize() !== 'all' && offer.configuration.size !== this.selectedSize()) continue;
      for (const option of offer.configuration.options) {
        if (!values.has(option.name)) values.set(option.name, new Set());
        values.get(option.name)?.add(option.value);
      }
    }
    return [...values.entries()]
      .filter(([, options]) => options.size > 1)
      .map(([name, options]) => ({ name, values: [...options].sort() }));
  });
  protected readonly matchingPriceOffers = computed(() => {
    const selectedOptions = this.selectedPriceOptions();
    return (this.prices()?.offers ?? []).filter((offer) => {
      if (offer.configuration.headgearIncluded !== this.headgearIncluded()) return false;
      if (this.selectedSize() !== 'all' && offer.configuration.size !== this.selectedSize()) {
        return false;
      }
      return Object.entries(selectedOptions).every(([name, value]) => {
        if (!value) return true;
        return offer.configuration.options.some(
          (option) => option.name === name && option.value === value
        );
      });
    });
  });
  protected readonly visiblePriceOffers = computed(() => {
    const byRetailer = new Map<string, RetailerPriceOffer>();
    for (const offer of this.matchingPriceOffers()) {
      const current = byRetailer.get(offer.retailer);
      if (
        !current ||
        (offer.inStock && !current.inStock) ||
        (offer.inStock === current.inStock && offer.priceCents < current.priceCents)
      ) {
        byRetailer.set(offer.retailer, offer);
      }
    }
    return [...byRetailer.values()].sort(
      (left, right) =>
        Number(right.inStock) - Number(left.inStock) ||
        left.priceCents - right.priceCents ||
        left.retailer.localeCompare(right.retailer)
    );
  });
  protected readonly activePriceOffer = computed(() => {
    const offers = this.visiblePriceOffers();
    const selected = this.selectedOffer();
    return (
      offers.find(
        (offer) =>
          offer.retailer === selected?.retailer &&
          offer.productUrl === selected.productUrl &&
          offer.variantId === selected.variantId
      ) ?? offers[0] ?? null
    );
  });
  protected readonly activeImage = computed(
    () => this.gallery()?.images[this.activeImageIndex()] ?? null
  );
  protected readonly bestFor = computed(() => this.contextsByIds(this.profile()?.bestFor ?? []));
  protected readonly mayNotSuit = computed(() =>
    this.contextsByIds(this.profile()?.mayNotSuit ?? [])
  );
  protected readonly mixedContexts = computed(
    () =>
      this.profile()?.contexts.filter(
        (context) => context.classification === 'mixed' && !context.limitedEvidence
      ) ?? []
  );
  protected readonly limitedContexts = computed(
    () => this.profile()?.contexts.filter((context) => context.limitedEvidence) ?? []
  );
  protected readonly rankedComponents = computed(() => {
    const evidenceRank = { strong: 3, moderate: 2, limited: 1 } as const;
    return [...(this.profile()?.parts ?? [])].sort(
      (left, right) =>
        right.reviewCount - left.reviewCount ||
        evidenceRank[right.evidenceStrength] - evidenceRank[left.evidenceStrength]
    );
  });
  protected readonly visibleComponents = computed(() =>
    this.showAllComponents() ? this.rankedComponents() : this.rankedComponents().slice(0, 8)
  );
  protected readonly topComfortSites = computed(() =>
    [...(this.profile()?.bodySites ?? [])]
      .filter((site) => site.positiveReviews >= 5 && site.complaintReviews < 5)
      .sort((left, right) => right.positiveReviews - left.positiveReviews)
      .slice(0, 5)
  );
  protected readonly topDiscomfortSites = computed(() =>
    [...(this.profile()?.bodySites ?? [])]
      .filter((site) => site.complaintReviews >= 5 && site.positiveReviews < 5)
      .sort((left, right) => right.complaintReviews - left.complaintReviews)
      .slice(0, 5)
  );
  protected readonly mixedBodySites = computed(() =>
    [...(this.profile()?.bodySites ?? [])]
      .filter((site) => site.positiveReviews >= 5 && site.complaintReviews >= 5)
      .sort(
        (left, right) =>
          right.positiveReviews +
          right.complaintReviews -
          (left.positiveReviews + left.complaintReviews)
      )
      .slice(0, 5)
  );
  protected readonly additionalAspects = computed(() => {
    const dimensionIds = new Set(this.profile()?.dimensions.map((dimension) => dimension.id) ?? []);
    const redundantAspectIds = new Set([
      'overall_satisfaction',
      'fit',
      'seal_leak',
      'stability',
      'ease_of_use',
      'therapy_effectiveness',
      'sizing',
      'therapy_compliance',
      'pain'
    ]);
    return (
      this.profile()?.aspects.filter(
        (aspect) => !dimensionIds.has(aspect.id) && !redundantAspectIds.has(aspect.id)
      ) ?? []
    );
  });
  protected readonly primaryReviewAspects = computed(() =>
    (this.profile()?.dimensions ?? []).slice(0, 6)
  );
  protected readonly secondaryReviewAspects = computed(() => [
    ...(this.profile()?.dimensions ?? []).slice(6),
    ...this.additionalAspects()
  ]);
  protected readonly reviewEvidence = computed<ReviewEvidence[]>(() => {
    const profile = this.profile();
    if (!profile) return [];
    const selectedAspect = this.selectedReviewAspect();
    const findings = [...profile.dimensions, ...this.additionalAspects()].filter(
      (finding) => selectedAspect === 'all' || finding.id === selectedAspect
    );
    const seen = new Set<string>();

    return findings.flatMap((finding) =>
      [
        ...finding.positiveEvidence.map((evidence) => ({ ...evidence, tone: 'positive' as const })),
        ...finding.negativeEvidence.map((evidence) => ({ ...evidence, tone: 'negative' as const }))
      ].flatMap((evidence) => {
        const key = `${evidence.retailer}|${evidence.text}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [{ ...evidence, aspectId: finding.id, aspectLabel: finding.label }];
      })
    );
  });
  protected readonly reviewPageCount = computed(() =>
    Math.max(1, Math.ceil(this.reviewEvidence().length / this.reviewPageSize))
  );
  protected readonly visibleReviewEvidence = computed(() => {
    const start = (this.reviewPage() - 1) * this.reviewPageSize;
    return this.reviewEvidence().slice(start, start + this.reviewPageSize);
  });
  protected readonly topGrades = computed(() => {
    const dimensions = this.profile()?.dimensions ?? [];
    return MaskDetail.TOP_GRADE_IDS.flatMap((id) => {
      const dimension = dimensions.find((item) => item.id === id);
      return dimension ? [dimension] : [];
    });
  });

  constructor(
    route: ActivatedRoute,
    maskData: MaskDataService,
    retailerData: RetailerDataService
  ) {
    route.paramMap
      .pipe(
        map((params) => params.get('maskSlug') ?? ''),
        distinctUntilChanged(),
        switchMap((slug) => {
          this.loading.set(true);
          this.loadError.set(false);
          this.profile.set(null);
          this.prices.set(null);
          this.gallery.set(null);
          this.selectedOffer.set(null);
          this.selectedRetailer.set(null);
          this.selectedSize.set('all');
          this.headgearIncluded.set(true);
          this.selectedPriceOptions.set({});
          this.activeImageIndex.set(0);
          this.activeAnalysisTab.set('overview');
          this.showAllComponents.set(false);
          this.expandedScoreEvidence.set(new Set());
          this.selectedReviewAspect.set('all');
          this.showAllReviewAspects.set(false);
          this.reviewPage.set(1);
          return forkJoin({
            profile: maskData.getProfile(slug),
            prices: maskData.getPrices(slug),
            gallery: maskData.getGallery(slug),
            retailerIndex: retailerData.getIndex().pipe(catchError(() => of(null)))
          });
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: ({ profile, prices, gallery, retailerIndex }) => {
          const cheapestOffer = prices?.cheapestOffer;
          const retailerProfiles = new Map(
            retailerIndex?.profiles.map((retailer) => [
              this.normalizeRetailerName(retailer.name),
              retailer
            ]) ?? []
          );
          this.profile.set(profile);
          this.prices.set(prices);
          this.gallery.set(gallery);
          this.retailerProfiles.set(retailerProfiles);
          this.selectedOffer.set(cheapestOffer ?? null);
          this.selectedRetailer.set(
            cheapestOffer
              ? retailerProfiles.get(
                  this.normalizeRetailerName(cheapestOffer.retailer)
                ) ?? null
              : null
          );
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

  protected selectAnalysisTab(tab: AnalysisTab): void {
    this.activeAnalysisTab.set(tab);
  }

  protected selectReviewAspect(aspectId: string): void {
    this.selectedReviewAspect.set(aspectId);
    this.reviewPage.set(1);
  }

  protected toggleAllReviewAspects(): void {
    this.showAllReviewAspects.update((visible) => !visible);
  }

  protected changeReviewPage(direction: -1 | 1): void {
    this.reviewPage.update((page) =>
      Math.min(this.reviewPageCount(), Math.max(1, page + direction))
    );
  }

  protected showMoreComponents(): void {
    this.showAllComponents.set(true);
  }

  protected praisedComponentAspects(part: PartFinding): MetricFinding[] {
    const criticizedIds = new Set(
      this.componentAspects(part, part.criticizedAspects).map((aspect) => aspect.id)
    );
    return this.componentAspects(part, part.praisedAspects).filter(
      (aspect) => !criticizedIds.has(aspect.id)
    );
  }

  protected criticizedComponentAspects(part: PartFinding): MetricFinding[] {
    const praisedIds = new Set(
      this.componentAspects(part, part.praisedAspects).map((aspect) => aspect.id)
    );
    return this.componentAspects(part, part.criticizedAspects).filter(
      (aspect) => !praisedIds.has(aspect.id)
    );
  }

  protected divisiveComponentAspects(part: PartFinding): MetricFinding[] {
    const criticizedIds = new Set(
      this.componentAspects(part, part.criticizedAspects).map((aspect) => aspect.id)
    );
    return this.componentAspects(part, part.praisedAspects).filter((aspect) =>
      criticizedIds.has(aspect.id)
    );
  }

  protected scoreEvidence(finding: MetricFinding): ScoreEvidence[] {
    const positive = finding.positiveEvidence.map((item) => ({
      ...item,
      tone: 'positive' as const
    }));
    const negative = finding.negativeEvidence.map((item) => ({
      ...item,
      tone: 'negative' as const
    }));
    const total = Math.min(5, positive.length + negative.length);
    if (!positive.length || finding.positiveReviews === 0) return negative.slice(0, total);
    if (!negative.length || finding.negativeReviews === 0) return positive.slice(0, total);

    const decisiveReviews = finding.positiveReviews + finding.negativeReviews;
    let positiveCount = Math.round(
      total * (decisiveReviews ? finding.positiveReviews / decisiveReviews : 0.5)
    );
    positiveCount = Math.max(1, Math.min(total - 1, positiveCount));
    positiveCount = Math.min(positiveCount, positive.length);
    let negativeCount = Math.min(total - positiveCount, negative.length);
    const remaining = total - positiveCount - negativeCount;
    positiveCount += Math.min(remaining, positive.length - positiveCount);
    negativeCount += Math.min(total - positiveCount - negativeCount, negative.length - negativeCount);
    return [...positive.slice(0, positiveCount), ...negative.slice(0, negativeCount)];
  }

  protected scoreEvidenceCount(finding: MetricFinding): number {
    return finding.positiveEvidence.length + finding.negativeEvidence.length;
  }

  protected scoreEvidenceExpanded(findingId: string): boolean {
    return this.expandedScoreEvidence().has(findingId);
  }

  protected toggleScoreEvidence(findingId: string): void {
    const expanded = new Set(this.expandedScoreEvidence());
    if (expanded.has(findingId)) {
      expanded.delete(findingId);
    } else {
      expanded.add(findingId);
    }
    this.expandedScoreEvidence.set(expanded);
  }

  protected scoreTrend(score: number): 'favorable' | 'mixed' | 'unfavorable' {
    if (score >= 70) return 'favorable';
    if (score <= 40) return 'unfavorable';
    return 'mixed';
  }

  protected scoreTrendArrow(score: number): string {
    return { favorable: '↗', mixed: '→', unfavorable: '↘' }[this.scoreTrend(score)];
  }

  protected formatCount(value: number): string {
    return value.toLocaleString();
  }

  protected formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  protected reviewShare(reviewCount: number): string {
    const processedReviews = this.profile()?.coverage.processedReviews ?? 0;
    return this.formatPercent(processedReviews ? reviewCount / processedReviews : 0);
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

  protected retailerProfile(name: string): RetailerProfile | null {
    return this.retailerProfiles().get(this.normalizeRetailerName(name)) ?? null;
  }

  protected retailerAspectGrades(profile: RetailerProfile): RetailerServiceAspect[] {
    return MaskDetail.RETAILER_GRADE_IDS.flatMap((aspectId) => {
      const aspect = profile.serviceAspects.find(
        (candidate) => candidate.aspect === aspectId && candidate.grade !== null
      );
      return aspect ? [aspect] : [];
    });
  }

  protected selectRetailerDetails(offer: RetailerPriceOffer): void {
    this.selectedOffer.set(offer);
    this.selectedRetailer.set(this.retailerProfile(offer.retailer));
  }

  protected isSelectedPriceOffer(offer: RetailerPriceOffer): boolean {
    const selected = this.activePriceOffer();
    return (
      selected?.retailer === offer.retailer &&
      selected.productUrl === offer.productUrl &&
      selected.variantId === offer.variantId
    );
  }

  protected selectPriceSize(size: string): void {
    this.selectedSize.set(size);
    this.selectedPriceOptions.set({});
    this.resetSelectedPriceOffer();
  }

  protected selectHeadgear(included: boolean): void {
    this.headgearIncluded.set(included);
    this.selectedSize.set('all');
    this.selectedPriceOptions.set({});
    this.resetSelectedPriceOffer();
  }

  protected selectPriceOption(name: string, value: string): void {
    this.selectedPriceOptions.update((selected) => ({ ...selected, [name]: value }));
    this.resetSelectedPriceOffer();
  }

  protected gradeBand(grade: string | null): 'high' | 'middle' | 'low' | 'none' {
    if (!grade) return 'none';
    if (grade.startsWith('A') || grade.startsWith('B')) return 'high';
    if (grade.startsWith('C') || grade.startsWith('D')) return 'middle';
    return 'low';
  }

  protected selectImage(index: number): void {
    const imageCount = this.gallery()?.images.length ?? 0;
    if (index >= 0 && index < imageCount) {
      this.activeImageIndex.set(index);
    }
  }

  protected previousImage(): void {
    this.moveGallery(-1);
  }

  protected nextImage(): void {
    this.moveGallery(1);
  }

  protected imageAlt(mask: MaskProfile, image: MaskGalleryImage): string {
    return `${mask.name} product image from ${image.retailer}`;
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

  protected interactionLabel(insight: InteractionInsight): string {
    const outcome =
      insight.tone === 'favorable'
        ? 'Comfort'
        : insight.tone === 'caution'
          ? 'Discomfort'
          : 'Comfort and Discomfort';
    return insight.label.replaceAll('Comfort and Discomfort', outcome);
  }

  private contextsByIds(ids: string[]): ContextFinding[] {
    const wanted = new Set(ids);
    return this.profile()?.contexts.filter((context) => wanted.has(context.id)) ?? [];
  }

  private componentAspects(part: PartFinding, aspects: MetricFinding[]): MetricFinding[] {
    const broadAspectIds = new Set(['overall_satisfaction', 'therapy_effectiveness']);
    const allAspects = [...part.praisedAspects, ...part.criticizedAspects];
    const hasSpecificAspect = allAspects.some((aspect) => !broadAspectIds.has(aspect.id));
    return hasSpecificAspect
      ? aspects.filter((aspect) => !broadAspectIds.has(aspect.id))
      : aspects;
  }

  private normalizeRetailerName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private resetSelectedPriceOffer(): void {
    this.selectedOffer.set(null);
    const offer = this.visiblePriceOffers()[0] ?? null;
    this.selectedRetailer.set(offer ? this.retailerProfile(offer.retailer) : null);
  }

  private priceSizeRank(size: string): number {
    const sizes = [
      'Extra Small',
      'Small',
      'Small-Medium',
      'Small Wide',
      'Medium',
      'Medium-Large',
      'Medium Wide',
      'Regular',
      'Standard',
      'Wide',
      'Large',
      'Large Wide',
      'Extra Large',
      'One Size',
      'Fit Pack'
    ];
    const position = sizes.indexOf(size);
    return position === -1 ? sizes.length : position;
  }

  private moveGallery(offset: number): void {
    const imageCount = this.gallery()?.images.length ?? 0;
    if (imageCount > 1) {
      this.activeImageIndex.set((this.activeImageIndex() + offset + imageCount) % imageCount);
    }
  }
}
