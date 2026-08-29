import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';

import { MIN_COMPARISON_REVIEWS } from './comparison-model';

const STORAGE_KEY = 'cpap-library-comparison';

export interface SelectedMask {
  slug: string;
  name: string;
  imageUrl: string;
  processedReviews: number;
}

export const COMPARISON_STORAGE = new InjectionToken<Storage>('comparison session storage', {
  providedIn: 'root',
  factory: () => globalThis.sessionStorage
});

@Injectable({ providedIn: 'root' })
export class ComparisonSelectionService {
  private readonly storage = inject(COMPARISON_STORAGE);
  readonly active = signal(false);
  readonly selected = signal<SelectedMask[]>([]);
  readonly warning = signal('');
  readonly comparisonParams = computed(() => {
    const selected = this.selected();
    return selected.length === 2 ? { mask1: selected[0].slug, mask2: selected[1].slug } : null;
  });

  constructor() {
    this.restore();
  }

  enter(): void {
    this.active.set(true);
    this.warning.set('');
    this.persist();
  }

  exit(): void {
    this.active.set(false);
    this.selected.set([]);
    this.warning.set('');
    this.persist();
  }

  isSelected(slug: string): boolean {
    return this.selected().some((mask) => mask.slug === slug);
  }

  select(mask: SelectedMask): void {
    this.active.set(true);
    this.warning.set('');
    if (mask.processedReviews < MIN_COMPARISON_REVIEWS) {
      this.warning.set(
        `${mask.name} does not have enough evidence to compare. At least 50 processed reviews are required.`
      );
      return;
    }
    if (this.isSelected(mask.slug)) return;
    if (this.selected().length === 2) {
      this.warning.set('Only two masks can be compared at a time');
      return;
    }
    this.selected.update((selected) => [...selected, mask]);
    this.persist();
  }

  remove(slug: string): void {
    this.selected.update((selected) => selected.filter((mask) => mask.slug !== slug));
    this.warning.set('');
    this.persist();
  }

  private persist(): void {
    this.storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ active: this.active(), selected: this.selected() })
    );
  }

  private restore(): void {
    try {
      const saved = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? 'null') as {
        active?: unknown;
        selected?: unknown;
      } | null;
      if (!saved || typeof saved.active !== 'boolean' || !Array.isArray(saved.selected)) return;
      const selected = saved.selected.filter(this.isSelectedMask).slice(0, 2);
      this.active.set(saved.active);
      this.selected.set(selected);
    } catch {
      this.storage.removeItem(STORAGE_KEY);
    }
  }

  private isSelectedMask(value: unknown): value is SelectedMask {
    if (!value || typeof value !== 'object') return false;
    const mask = value as Partial<SelectedMask>;
    return (
      typeof mask.slug === 'string' &&
      typeof mask.name === 'string' &&
      typeof mask.imageUrl === 'string' &&
      typeof mask.processedReviews === 'number'
    );
  }
}
