import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { MaskPrices, MaskProfile, MetricFinding } from '../mask-data';
import { MaskDataService } from '../mask-data.service';
import { ComparePage } from './compare-page';
import { ComparisonSummaryResponse, ComparisonSummaryService } from './comparison-summary.service';

function dimension(id: string, label: string, score: number): MetricFinding {
  return {
    id,
    label,
    score,
    grade: score >= 80 ? 'A-' : 'B',
    averageSentiment: score / 10,
    reviewCount: 20,
    reviewShare: 0.2,
    positiveReviews: 15,
    neutralReviews: 1,
    negativeReviews: 4,
    evidenceStrength: 'moderate',
    positiveEvidence: [{ text: `${label} worked well`, retailer: 'Store', productUrl: '#' }],
    negativeEvidence: []
  };
}

const DIMENSIONS = [
  dimension('fit-and-sizing', 'Fit & sizing', 82),
  dimension('comfort', 'Comfort', 80),
  dimension('seal-and-leaks', 'Seal & leaks', 78),
  dimension('sleep-compatibility', 'Stability', 76),
  dimension('ease-of-use', 'Ease of use', 84),
  dimension('airflow-and-noise', 'Airflow & noise', 74),
  dimension('skin-and-pain', 'Skin & pain', 70)
];

function profile(slug: string, type: string, scoreOffset = 0): MaskProfile {
  return {
    schemaVersion: 3,
    slug,
    name: slug === 'mask-a' ? 'Mask A' : 'Mask B',
    catalogOrder: 1,
    search: { aliases: [], abbreviations: [], maskTypes: [type] },
    coverage: {
      status: 'complete',
      processedReviews: slug === 'mask-a' ? 75 : 100,
      eligibleReviews: 100,
      processedShare: 1,
      retailerCount: 2,
      reviewDateStart: null,
      reviewDateEnd: null
    },
    overall: {
      score: 99,
      grade: 'A+',
      calculation: '',
      ratingComponent: {
        score: 99,
        reviewCount: slug === 'mask-a' ? 75 : 100,
        weight: 0.9,
        average: slug === 'mask-a' ? 4.4 : 4.1
      },
      textSatisfactionComponent: { score: 99, reviewCount: 100, weight: 0.1 }
    },
    dimensions: DIMENSIONS.map((item) => ({ ...item, score: item.score + scoreOffset })),
    aspects: [],
    parts: [],
    partAspectMatrix: [],
    contexts: [],
    contextAspectMatrix: [],
    bestFor: [],
    mayNotSuit: [],
    bodySites: [],
    interactionSummary: [],
    interactionInsights: [],
    strengths: [],
    concerns: [],
    retailers: [],
    evidence: { positive: [], negative: [] },
    methodology: {
      overallScore: '',
      aggregation: '',
      sentiment: '',
      minimumEvidence: '',
      limitations: ''
    }
  };
}

function prices(slug: string): MaskPrices {
  const offer = {
    retailer: 'Example Store',
    productName: 'Complete mask',
    productUrl: '#',
    variantName: 'Standard',
    variantId: 'standard',
    priceCents: slug === 'mask-a' ? 9900 : 10900,
    price: slug === 'mask-a' ? '$99.00' : '$109.00',
    currency: 'USD',
    inStock: true,
    observedAt: '2026-08-20T00:00:00Z',
    configurationNote: '',
    configuration: {
      offerType: 'complete' as const,
      headgearIncluded: true,
      size: 'Medium',
      frameSize: null,
      headgearSize: null,
      fitPack: false,
      options: []
    }
  };
  return {
    schemaVersion: 2,
    mask: slug,
    slug,
    generatedAt: '2026-08-20T00:00:00Z',
    status: 'available',
    defaultHeadgearIncluded: true,
    cheapestOffer: offer,
    offers: [offer],
    sizeRanges: [],
    priceHistory: [],
    methodology: ''
  };
}

describe('ComparePage', () => {
  let fixture: ComponentFixture<ComparePage>;
  let queryParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let data: jasmine.SpyObj<MaskDataService>;
  let summaries: jasmine.SpyObj<ComparisonSummaryService>;
  let summaryResult: Subject<ComparisonSummaryResponse>;

  beforeEach(async () => {
    queryParams = new BehaviorSubject(convertToParamMap({ mask1: 'mask-a', mask2: 'mask-b' }));
    data = jasmine.createSpyObj<MaskDataService>('MaskDataService', ['getProfile', 'getPrices']);
    data.getProfile.and.callFake((slug) =>
      of(slug === 'mask-a' ? profile(slug, 'Nasal') : profile(slug, 'Full Face', -5))
    );
    data.getPrices.and.callFake((slug) => of(prices(slug)));
    summaryResult = new Subject<ComparisonSummaryResponse>();
    summaries = jasmine.createSpyObj<ComparisonSummaryService>('ComparisonSummaryService', [
      'getSummary'
    ]);
    summaries.getSummary.and.returnValue(summaryResult);

    await TestBed.configureTestingModule({
      imports: [ComparePage],
      providers: [
        provideRouter([]),
        { provide: MaskDataService, useValue: data },
        { provide: ComparisonSummaryService, useValue: summaries },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComparePage);
    fixture.detectChanges();
  });

  it('hydrates from query parameters and renders deterministic content while summary loads', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(data.getProfile.calls.allArgs()).toEqual([['mask-a'], ['mask-b']]);
    expect(element.querySelectorAll('.comparison-mask-header').length).toBe(2);
    expect(element.querySelector('.cpapworld-header .brand')?.textContent).toContain('DreamSeal');
    expect(element.querySelector('.header-waitlist')?.textContent).toContain(
      'Win Lifetime Free Custom Masks!'
    );
    expect(element.querySelector('.compare-title-row h1')?.textContent).toContain(
      'Mask A vs Mask B'
    );
    expect(element.querySelector('.back-button')?.getAttribute('href')).toBe('/library');
    expect(element.querySelector('.library-link')).toBeNull();
    expect(element.textContent).toContain('Mask A');
    expect(element.textContent).toContain('Mask B');
    expect(element.querySelector('.overview-type')).toBeNull();
    expect(element.textContent).toContain('Limited evidence');
    expect(element.querySelector('.evidence-notice[data-side="left"]')?.getAttribute('aria-label'))
      .toContain('Mask A');
    expect(element.textContent).toContain('Generating comparison summary');
    expect(element.querySelectorAll('.criterion-row').length).toBe(6);
    expect(element.querySelector('.criterion-row')?.textContent).toContain('Fit & sizing');
    expect(element.querySelector('.criteria-selectors')).toBeNull();
    expect(element.textContent).toContain('4.4');
    expect(element.textContent).toContain('75 reviews');
    expect(element.querySelectorAll('.overview-offer a[target="_blank"]').length).toBe(2);
    expect(element.textContent).not.toContain('A+');
    expect(element.textContent?.toLowerCase()).not.toContain('overall winner');
    expect(element.querySelectorAll('a[aria-label^="View full analysis"]').length).toBe(2);
  });

  it('renders complaint severity when body-area evidence provides it', () => {
    data.getProfile.and.callFake((slug) => {
      const result = profile(slug, slug === 'mask-a' ? 'Nasal' : 'Full Face');
      result.bodySites = [
        {
          ...dimension('nose', 'Nose', 70),
          complaintReviews: 5,
          complaintShare: 0.05,
          complaintSeverity: 40,
          complaintAspects: [],
          involvedParts: []
        }
      ];
      return of(result);
    });
    queryParams.next(convertToParamMap({ mask1: 'mask-b', mask2: 'mask-a' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Complaint severity 40%');
    expect(fixture.nativeElement.textContent).toContain('15 comfort reports · 5 complaint reports');
  });

  it('ignores a summary response from a previous mask pair', () => {
    const currentSummary = new Subject<ComparisonSummaryResponse>();
    summaries.getSummary.and.returnValue(currentSummary);
    queryParams.next(convertToParamMap({ mask1: 'mask-b', mask2: 'mask-a' }));
    currentSummary.next({
      source: 'generated',
      summary: {
        decisionTakeaway: 'Current pair takeaway',
        reasonsToPreferMask1: [],
        reasonsToPreferMask2: [],
        similarities: [],
        importantUncertainties: []
      }
    });
    summaryResult.next({
      source: 'generated',
      summary: {
        decisionTakeaway: 'Stale pair takeaway',
        reasonsToPreferMask1: [],
        reasonsToPreferMask2: [],
        similarities: [],
        importantUncertainties: []
      }
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Current pair takeaway');
    expect(fixture.nativeElement.textContent).not.toContain('Stale pair takeaway');
  });

  it('renders a structured summary without criterion-selection controls', () => {
    summaryResult.next({
      source: 'generated',
      summary: {
        decisionTakeaway: 'Mask A emphasizes ease, while Mask B may suit another fit.',
        reasonsToPreferMask1: ['Higher ease-of-use evidence'],
        reasonsToPreferMask2: ['A different fit profile'],
        similarities: ['Comfort is similar'],
        importantUncertainties: ['Mask A has limited evidence']
      }
    });
    summaryResult.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mask A emphasizes ease');
    expect(fixture.nativeElement.textContent).toContain('Comfort is similar');
    expect(fixture.nativeElement.textContent).not.toContain('Generating comparison summary');

    expect(
      fixture.nativeElement.querySelector('select[aria-label^="Comparison criterion"]')
    ).toBeNull();
    expect(summaries.getSummary).toHaveBeenCalledTimes(1);
  });

  it('falls back to the lowest individual-mask offer when headgear is unavailable', () => {
    data.getPrices.and.callFake((slug) => {
      const result = prices(slug);
      result.offers[0] = {
        ...result.offers[0],
        price: '$49.00',
        priceCents: 4900,
        configuration: {
          ...result.offers[0].configuration,
          offerType: 'without_headgear',
          headgearIncluded: false
        }
      };
      return of(result);
    });
    queryParams.next(convertToParamMap({ mask1: 'mask-b', mask2: 'mask-a' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.product-overview')?.textContent).toContain(
      '$49.00'
    );
    expect(fixture.nativeElement.querySelectorAll('.headgear-warning').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Headgear is not included');
  });

  it('keeps deterministic comparison usable when summary generation fails', () => {
    summaries.getSummary.and.returnValue(throwError(() => new Error('unavailable')));
    queryParams.next(convertToParamMap({ mask1: 'mask-b', mask2: 'mask-a' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.criterion-row').length).toBe(6);
    expect(fixture.nativeElement.textContent).not.toContain('Generating comparison summary');
    expect(fixture.nativeElement.textContent).toContain('Comparison summary is unavailable');
  });

  it('shows recoverable errors for missing, duplicate, and unknown slugs', () => {
    for (const params of [
      { mask1: 'mask-a' },
      { mask1: 'mask-a', mask2: 'mask-a' }
    ]) {
      queryParams.next(convertToParamMap(params));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.comparison-error')?.textContent).toContain(
        'Choose two different masks'
      );
      expect(fixture.nativeElement.querySelector('.comparison-error a')?.getAttribute('href')).toBe(
        '/library'
      );
    }

    data.getProfile.and.returnValue(throwError(() => new Error('not found')));
    queryParams.next(convertToParamMap({ mask1: 'unknown', mask2: 'mask-b' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.comparison-error')?.textContent).toContain(
      'could not be found'
    );
  });

  it('uses one headgear control for both price columns', () => {
    const toggle = fixture.nativeElement.querySelector(
      'input[aria-label="Include headgear"]'
    ) as HTMLInputElement;
    expect(toggle.checked).toBeTrue();
    expect(fixture.nativeElement.querySelector('.comparison-pricing')?.textContent).toContain(
      '$99.00'
    );
    expect(fixture.nativeElement.querySelector('.comparison-pricing')?.textContent).toContain(
      'Standard · Size Medium'
    );

    toggle.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.comparison-pricing')?.textContent).toContain(
      'There are no offers without headgear'
    );
  });
});
