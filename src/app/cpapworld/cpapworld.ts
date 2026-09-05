import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MaskIndexItem } from './mask-data';
import { MaskDataService } from './mask-data.service';
import { WaitlistSignup } from '../waitlist-signup/waitlist-signup';
import { randomCustomMaskImage } from '../custom-mask-image';
import { ComparisonControls } from './comparison/comparison-controls';
import { ComparisonSelectionService } from './comparison/comparison-selection.service';

@Component({
  selector: 'app-cpapworld',
  imports: [RouterLink, WaitlistSignup, ComparisonControls],
  templateUrl: './cpapworld.html',
  styleUrl: './cpapworld.css'
})
export class CpapWorld {
  protected readonly comparison = inject(ComparisonSelectionService);
  protected readonly maskTypes = ['Full Face', 'Nasal', 'Nasal Pillow', 'Hybrid'];
  protected readonly customMaskImage = randomCustomMaskImage();
  protected readonly masks = signal<MaskIndexItem[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly selectedMaskType = signal('');
  protected readonly selectedBestFor = signal<string[]>([]);
  protected readonly sortBy = signal('recommended');
  protected readonly activeRefineTab = signal<'best-for' | 'sort'>('sort');
  protected readonly bestForOptions = computed(() =>
    [...new Set(this.masks().flatMap((mask) => mask.bestReportedFor.map((item) => item.label)))].sort(
      (a, b) => a.localeCompare(b)
    )
  );
  protected readonly activeFilterCount = computed(
    () => Number(Boolean(this.selectedMaskType())) + this.selectedBestFor().length
  );
  protected readonly filteredMasks = computed(() => {
    const query = this.normalize(this.searchQuery());
    const selectedType = this.normalize(this.selectedMaskType());
    const selectedBestFor = new Set(this.selectedBestFor().map((value) => this.normalize(value)));
    const results = this.masks()
      .map((mask) => ({ mask, score: query ? this.searchScore(mask, query) : 0 }))
      .filter((result): result is { mask: MaskIndexItem; score: number } => result.score !== null)
      .filter(({ mask }) =>
        selectedType
          ? mask.search.maskTypes.some((type) => this.normalize(type) === selectedType)
          : true
      )
      .filter(({ mask }) =>
        selectedBestFor.size
          ? mask.bestReportedFor.some((item) => selectedBestFor.has(this.normalize(item.label)))
          : true
      );

    results.sort((a, b) => {
      if (this.sortBy() === 'price-low') return this.comparePrices(a.mask, b.mask, 1);
      if (this.sortBy() === 'price-high') return this.comparePrices(a.mask, b.mask, -1);
      if (this.sortBy() === 'rating') {
        return (b.mask.overall.score ?? -1) - (a.mask.overall.score ?? -1);
      }
      return a.score - b.score || a.mask.catalogOrder - b.mask.catalogOrder;
    });

    return results.map((result) => result.mask);
  });
  protected readonly catalogLoading = signal(true);
  protected readonly catalogError = signal(false);
  private readonly minimumPrices = signal(new Map<string, { label: string; priceCents: number }>());

  constructor(maskData: MaskDataService, private readonly router: Router) {
    forkJoin({ index: maskData.getIndex(), prices: maskData.getPriceIndex() }).subscribe({
      next: ({ index, prices }) => {
        this.masks.set([...index.masks].sort((a, b) => a.catalogOrder - b.catalogOrder));
        this.minimumPrices.set(
          new Map(
            prices?.masks.flatMap((mask) =>
              mask.cheapestOffer
                ? [[mask.slug, { label: mask.cheapestOffer.price, priceCents: mask.cheapestOffer.priceCents }] as const]
                : []
            ) ?? []
          )
        );
        this.catalogLoading.set(false);
      },
      error: () => {
        this.catalogError.set(true);
        this.catalogLoading.set(false);
      }
    });
  }

  protected minimumPrice(slug: string): string | null {
    return this.minimumPrices().get(slug)?.label ?? null;
  }

  protected updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected toggleMaskType(maskType: string): void {
    this.selectedMaskType.update((current) => (current === maskType ? '' : maskType));
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.selectedMaskType.set('');
    this.selectedBestFor.set([]);
    this.sortBy.set('recommended');
  }

  protected toggleBestFor(value: string): void {
    this.selectedBestFor.update((selected) =>
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
    );
  }

  protected isBestForSelected(value: string): boolean {
    return this.selectedBestFor().includes(value);
  }

  protected selectSort(value: string): void {
    this.sortBy.set(value);
  }

  protected selectRefineTab(tab: 'best-for' | 'sort'): void {
    this.activeRefineTab.set(tab);
  }

  protected clearRefinements(): void {
    this.selectedMaskType.set('');
    this.selectedBestFor.set([]);
    this.sortBy.set('recommended');
  }

  protected closeSelect(event: Event): void {
    const select = event.currentTarget as HTMLDetailsElement;
    select.removeAttribute('open');
    select.querySelector<HTMLElement>('summary')?.focus();
  }

  protected closeSelectFromButton(select: HTMLDetailsElement): void {
    select.removeAttribute('open');
    select.querySelector<HTMLElement>('summary')?.focus();
  }

  protected hasRefinements(): boolean {
    return Boolean(this.activeFilterCount() || this.sortBy() !== 'recommended');
  }

  protected hasActiveCriteria(): boolean {
    return Boolean(this.searchQuery().trim() || this.activeFilterCount());
  }

  protected submitSearch(event: SubmitEvent): void {
    event.preventDefault();
    const match = this.filteredMasks()[0];
    if (match && this.searchQuery().trim()) {
      void this.router.navigate(['/library/masks', match.slug]);
    }
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

  protected selectForComparison(mask: MaskIndexItem): void {
    if (this.comparison.isSelected(mask.slug)) {
      this.comparison.remove(mask.slug);
      return;
    }
    this.comparison.select({
      slug: mask.slug,
      name: mask.name,
      imageUrl: `/images/masks/${mask.slug}.webp`,
      processedReviews: mask.coverage.processedReviews
    });
  }

  protected handleMaskCard(event: MouseEvent, mask: MaskIndexItem): void {
    if (!this.comparison.active()) return;
    event.preventDefault();
    this.selectForComparison(mask);
  }

  private searchScore(mask: MaskIndexItem, query: string): number | null {
    const canonical = this.normalize(mask.name);
    const terms = [
      mask.name,
      ...mask.search.aliases,
      ...mask.search.abbreviations,
      ...mask.search.maskTypes,
      ...mask.bestReportedFor.map((context) => context.label),
      ...mask.extraCaution.map((context) => context.label)
    ].map((term) => this.normalize(term));
    const compactQuery = query.replaceAll(' ', '');
    const tokens = query.split(' ').filter(Boolean);

    if (canonical === query) return 0;
    if (terms.some((term) => term === query)) return 1;
    if (canonical.startsWith(query)) return 2;
    if (terms.some((term) => term.startsWith(query))) return 3;
    if (terms.some((term) => term.replaceAll(' ', '').includes(compactQuery))) return 4;

    const haystack = terms.join(' ');
    return tokens.every((token) => haystack.includes(token)) ? 5 : null;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private comparePrices(a: MaskIndexItem, b: MaskIndexItem, direction: 1 | -1): number {
    const aPrice = this.minimumPrices().get(a.slug)?.priceCents;
    const bPrice = this.minimumPrices().get(b.slug)?.priceCents;
    if (aPrice === undefined) return bPrice === undefined ? a.catalogOrder - b.catalogOrder : 1;
    if (bPrice === undefined) return -1;
    return direction * (aPrice - bPrice) || a.catalogOrder - b.catalogOrder;
  }
}
