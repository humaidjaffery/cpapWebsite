import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import {
  COMPARISON_STORAGE,
  ComparisonSelectionService,
  SelectedMask
} from './comparison-selection.service';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const MASK_A: SelectedMask = {
  slug: 'mask-a',
  name: 'Mask A',
  imageUrl: '/images/masks/mask-a.webp',
  processedReviews: 100
};

const MASK_B: SelectedMask = {
  slug: 'mask-b',
  name: 'Mask B',
  imageUrl: '/images/masks/mask-b.webp',
  processedReviews: 50
};

const MASK_C: SelectedMask = {
  slug: 'mask-c',
  name: 'Mask C',
  imageUrl: '/images/masks/mask-c.webp',
  processedReviews: 99
};

describe('ComparisonSelectionService', () => {
  let storage: MemoryStorage;
  let selection: ComparisonSelectionService;

  beforeEach(() => {
    storage = new MemoryStorage();
    TestBed.configureTestingModule({ providers: [{ provide: COMPARISON_STORAGE, useValue: storage }] });
    selection = TestBed.inject(ComparisonSelectionService);
  });

  it('enters and exits comparison selection mode', () => {
    expect(selection.active()).toBeFalse();

    selection.enter();
    expect(selection.active()).toBeTrue();

    selection.select(MASK_A);
    selection.exit();
    expect(selection.active()).toBeFalse();
    expect(selection.selected()).toEqual([]);
  });

  it('selects two distinct masks, ignores duplicates, and builds ordered navigation parameters', () => {
    selection.select(MASK_A);
    selection.select(MASK_A);
    selection.select(MASK_B);

    expect(selection.active()).toBeTrue();
    expect(selection.selected()).toEqual([MASK_A, MASK_B]);
    expect(selection.isSelected(MASK_A.slug)).toBeTrue();
    expect(selection.isSelected('not-selected')).toBeFalse();
    expect(selection.comparisonParams()).toEqual({ mask1: 'mask-a', mask2: 'mask-b' });
  });

  it('removes either selected mask', () => {
    selection.select(MASK_A);
    selection.select(MASK_B);

    selection.remove(MASK_A.slug);

    expect(selection.selected()).toEqual([MASK_B]);
    expect(selection.comparisonParams()).toBeNull();
  });

  it('keeps the selected pair and reports a non-modal warning when a third mask is attempted', () => {
    selection.select(MASK_A);
    selection.select(MASK_B);

    selection.select(MASK_C);

    expect(selection.selected()).toEqual([MASK_A, MASK_B]);
    expect(selection.warning()).toBe('Only two masks can be compared at a time');
  });

  it('clears comparison warnings after four seconds', fakeAsync(() => {
    selection.select(MASK_A);
    selection.select(MASK_B);
    selection.select(MASK_C);

    tick(3999);
    expect(selection.warning()).toBe('Only two masks can be compared at a time');

    tick(1);
    expect(selection.warning()).toBe('');
  }));

  it('blocks masks with fewer than 50 processed reviews', () => {
    selection.select({ ...MASK_A, processedReviews: 49 });

    expect(selection.selected()).toEqual([]);
    expect(selection.warning()).toContain('does not have enough evidence');
    expect(selection.warning()).toContain('50 processed reviews');
  });

  it('restores active selection from session storage', () => {
    selection.select(MASK_A);
    selection.select(MASK_B);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: COMPARISON_STORAGE, useValue: storage }] });
    selection = TestBed.inject(ComparisonSelectionService);

    expect(selection.active()).toBeTrue();
    expect(selection.selected()).toEqual([MASK_A, MASK_B]);
  });
});
