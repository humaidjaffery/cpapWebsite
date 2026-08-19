import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { MaskGallery, MaskPrices, MaskProfile } from '../mask-data';
import { MaskDataService } from '../mask-data.service';
import { RetailerIndex } from '../retailer-data';
import { RetailerDataService } from '../retailer-data.service';
import { MaskDetail } from './mask-detail';

const PROFILE: MaskProfile = {
  schemaVersion: 3,
  slug: 'resmed-airfit-f20',
  name: 'ResMed AirFit F20',
  catalogOrder: 2,
  search: {
    aliases: ['AirFit F20 Full Face Mask', 'F20 mask'],
    abbreviations: ['F20'],
    maskTypes: ['Full Face']
  },
  coverage: {
    status: 'complete',
    processedReviews: 100,
    eligibleReviews: 100,
    processedShare: 1,
    retailerCount: 3,
    reviewDateStart: '2024-01-01',
    reviewDateEnd: '2026-01-01'
  },
  overall: {
    score: 80,
    grade: 'B+',
    calculation: '90% star rating + 10% review-text satisfaction',
    ratingComponent: { average: 4.2, score: 80, reviewCount: 100, weight: 0.9 },
    textSatisfactionComponent: {
      averageSentiment: 8.4,
      score: 84,
      reviewCount: 80,
      weight: 0.1
    }
  },
  dimensions: [
    {
      id: 'comfort',
      label: 'Comfort',
      score: 82,
      grade: 'B+',
      averageSentiment: 8.2,
      reviewCount: 60,
      reviewShare: 0.6,
      positiveReviews: 50,
      neutralReviews: 5,
      negativeReviews: 5,
      evidenceStrength: 'moderate',
      positiveEvidence: Array.from({ length: 5 }, (_, index) => ({
        text: `Positive comfort quote ${index + 1}`,
        retailer: 'Example Store',
        productUrl: `https://example.test/positive-${index + 1}`
      })),
      negativeEvidence: Array.from({ length: 5 }, (_, index) => ({
        text: `Negative comfort quote ${index + 1}`,
        retailer: 'Example Store',
        productUrl: `https://example.test/negative-${index + 1}`
      }))
    }
  ],
  aspects: [],
  parts: [],
  partAspectMatrix: [],
  contexts: [
    {
      id: 'side-sleepers',
      label: 'Side sleepers',
      score: 85,
      grade: 'A-',
      averageSentiment: 8.5,
      reviewCount: 20,
      reviewShare: 0.2,
      positiveReviews: 18,
      neutralReviews: 1,
      negativeReviews: 1,
      evidenceStrength: 'moderate',
      positiveEvidence: [],
      negativeEvidence: [],
      sourceContexts: ['side_sleeping'],
      classification: 'favorable',
      limitedEvidence: false
    },
    {
      id: 'claustrophobia',
      label: 'People with claustrophobia',
      score: 20,
      grade: 'F',
      averageSentiment: 2,
      reviewCount: 12,
      reviewShare: 0.12,
      positiveReviews: 1,
      neutralReviews: 1,
      negativeReviews: 10,
      evidenceStrength: 'limited',
      positiveEvidence: [],
      negativeEvidence: [],
      sourceContexts: ['claustrophobia'],
      classification: 'unfavorable',
      limitedEvidence: false
    }
  ],
  contextAspectMatrix: [],
  bestFor: ['side-sleepers'],
  mayNotSuit: ['claustrophobia'],
  bodySites: [],
  interactionSummary: [
    'The clearest favorable pattern was sleep position compatibility among side sleepers.'
  ],
  interactionInsights: [
    {
      id: 'context|side-sleepers|sleep_position_compatibility',
      label: 'Nasal Pillows at Nostrils: Comfort and Discomfort',
      kind: 'patient-context',
      tone: 'favorable',
      description:
        'Among side sleepers, reports about sleep position compatibility leaned favorable.',
      contextId: 'side-sleepers',
      contextLabel: 'Side sleepers',
      aspectId: 'sleep_position_compatibility',
      aspectLabel: 'Sleep Position Compatibility',
      outcomeAspects: [
        { id: 'sleep_position_compatibility', label: 'Sleep Position Compatibility', reviewCount: 20 }
      ],
      parts: [{ id: 'cushion', label: 'Cushion', reviewCount: 12 }],
      bodySites: [{ id: 'face', label: 'Face', reviewCount: 8 }],
      contexts: [],
      score: 85,
      grade: 'A-',
      averageSentiment: 8.5,
      reviewCount: 20,
      reviewShare: 0.2,
      positiveReviews: 18,
      neutralReviews: 1,
      negativeReviews: 1,
      evidenceStrength: 'moderate',
      positiveEvidence: [],
      negativeEvidence: []
    }
  ],
  strengths: [],
  concerns: [],
  retailers: [],
  evidence: { positive: [], negative: [] },
  methodology: {
    overallScore: 'Composite method.',
    aggregation: 'Review-level aggregation.',
    sentiment: 'Sentiment thresholds.',
    minimumEvidence: 'Five reviews.',
    limitations: 'Not medical advice.'
  }
};

const PRICES: MaskPrices = {
  schemaVersion: 2,
  mask: PROFILE.name,
  slug: PROFILE.slug,
  generatedAt: '2026-08-02T12:00:00Z',
  status: 'available',
  defaultHeadgearIncluded: true,
  cheapestOffer: {
    retailer: 'Example Store',
    productName: 'AirFit F20 complete mask',
    productUrl: 'https://example.test/f20',
    variantId: 'complete-medium',
    variantName: 'Complete Mask / Medium',
    priceCents: 14900,
    price: '$149.00',
    currency: 'USD',
    inStock: true,
    observedAt: '2026-08-02T12:00:00Z',
    configurationNote: '',
    configuration: {
      offerType: 'complete',
      headgearIncluded: true,
      size: 'Medium',
      frameSize: null,
      headgearSize: null,
      fitPack: false,
      options: []
    }
  },
  offers: [],
  sizeRanges: [
    {
      size: 'Medium',
      minimumPriceCents: 14900,
      maximumPriceCents: 14900,
      minimumPrice: '$149.00',
      maximumPrice: '$149.00'
    },
    {
      size: 'Large',
      minimumPriceCents: 17900,
      maximumPriceCents: 17900,
      minimumPrice: '$179.00',
      maximumPrice: '$179.00'
    }
  ],
  priceHistory: [
    { date: '2026-08-01', retailer: 'Example Store', priceCents: 14900, price: '$149.00' }
  ],
  methodology: 'Shipping and tax are not included.'
};
PRICES.offers = [
  PRICES.cheapestOffer!,
  {
    retailer: 'Second Store',
    productName: 'AirFit F20 mask kit',
    productUrl: 'https://second.example.test/f20',
    variantId: 'complete-large',
    variantName: 'Large',
    priceCents: 17900,
    price: '$179.00',
    compareAtPriceCents: 19900,
    compareAtPrice: '$199.00',
    currency: 'USD',
    inStock: true,
    observedAt: '2026-08-03T15:30:00Z',
    configurationNote: '',
    configuration: {
      offerType: 'complete',
      headgearIncluded: true,
      size: 'Large',
      frameSize: null,
      headgearSize: null,
      fitPack: false,
      options: []
    }
  }
];

const RETAILERS: RetailerIndex = {
  schemaVersion: 1,
  generatedAt: '2026-08-02T12:00:00Z',
  verifiedOn: '2026-08-02',
  profiles: [
    {
      slug: 'example-store',
      name: 'Example Store',
      websiteUrl: 'https://example.test',
      reviewEvidence: {
        scrapedReviewCount: 100,
        eligibleReviewCount: 100,
        processedReviewCount: 100,
        averageRating: 4.5,
        ratingCount: 100,
        maskCount: 5,
        reviewDateStart: null,
        reviewDateEnd: null,
        serviceScopedReviewCount: 50,
        serviceClaimReviewCount: 40,
        serviceGrade: 'A-',
        evidenceStrength: 'moderate'
      },
      serviceAspects: [
        {
          aspect: 'service',
          label: 'Service',
          reviewCount: 30,
          decisiveReviewCount: 28,
          positiveShare: 0.85,
          grade: 'A-',
          positiveReviews: 24,
          mixedReviews: 2,
          negativeReviews: 4,
          evidenceStrength: 'moderate',
          positiveEvidence: [],
          negativeEvidence: []
        },
        {
          aspect: 'shipping',
          label: 'Shipping',
          reviewCount: 20,
          decisiveReviewCount: 18,
          positiveShare: 0.75,
          grade: 'B',
          positiveReviews: 14,
          mixedReviews: 2,
          negativeReviews: 4,
          evidenceStrength: 'moderate',
          positiveEvidence: [],
          negativeEvidence: []
        }
      ],
      policies: []
    }
  ],
  methodology: { reviews: '', serviceClaims: '', serviceScore: '', policies: '' }
};

const GALLERY: MaskGallery = {
  schemaVersion: 1,
  maskId: 2,
  maskName: PROFILE.name,
  slug: PROFILE.slug,
  imageCount: 2,
  images: [
    {
      id: 'resmed-airfit-f20-01',
      src: '/images/mask-galleries/resmed-airfit-f20/01-cpap-com.webp',
      retailer: 'CPAP.com',
      sourceUrl: 'https://images.example.test/f20-1.png',
      productUrl: 'https://example.test/f20',
      originalWidth: 1600,
      originalHeight: 1600,
      hasTransparency: true,
      isPrimary: true
    },
    {
      id: 'resmed-airfit-f20-02',
      src: '/images/mask-galleries/resmed-airfit-f20/02-1800cpap-com.webp',
      retailer: '1800CPAP.COM',
      sourceUrl: 'https://images.example.test/f20-2.jpg',
      productUrl: 'https://example.test/f20-respshop',
      originalWidth: 1200,
      originalHeight: 1200,
      hasTransparency: false,
      isPrimary: false
    }
  ]
};

describe('MaskDetail', () => {
  let fixture: ComponentFixture<MaskDetail>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let data: jasmine.SpyObj<MaskDataService>;

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ maskSlug: PROFILE.slug }));
    data = jasmine.createSpyObj<MaskDataService>('MaskDataService', [
      'getProfile',
      'getGallery',
      'getPrices'
    ]);
    data.getProfile.and.returnValue(of(PROFILE));
    data.getGallery.and.returnValue(of(GALLERY));
    data.getPrices.and.returnValue(of(PRICES));

    await TestBed.configureTestingModule({
      imports: [MaskDetail],
      providers: [
        provideRouter([]),
        { provide: MaskDataService, useValue: data },
        { provide: RetailerDataService, useValue: { getIndex: () => of(RETAILERS) } },
        { provide: ActivatedRoute, useValue: { paramMap: params } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MaskDetail);
    fixture.detectChanges();
  });

  it('renders the mask score, dimensions, and favorable patient context', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toContain(PROFILE.name);
    expect(element.querySelector('.score-orb')?.textContent).toContain('B+');
    expect(element.querySelector('.score-breakdowns')?.textContent).toContain('Comfort');
    expect(element.querySelector('.score-patient-fit')).toBeNull();
    expect(element.querySelector('.score-breakdowns')?.textContent).toContain('50 positive');
    expect(element.querySelector('.score-breakdowns')?.textContent).toContain('5 neutral');
    expect(element.querySelector('.score-breakdowns')?.textContent).toContain('5 negative');
    expect(element.querySelector('.mask-hero .mask-gallery')).toBeTruthy();
    expect(element.querySelector('.mask-hero .score-panel')).toBeTruthy();
    expect(element.querySelector('.detail-header .back-link')).toBeNull();
    expect(element.querySelector('.detail-header .header-waitlist input')).toBeNull();
    expect(element.querySelector('.detail-header .header-waitlist a')?.textContent).toContain(
      'Win Lifetime Free Custom Masks!'
    );
    expect(element.querySelector('.detail-header .header-waitlist a')?.getAttribute('href')).toBe('/');
    expect(element.querySelector('.detail-header .retailer-guide-link')).toBeNull();
    expect(element.querySelector('.hero-heading-row .back-link')?.textContent?.trim()).toBe('←');
    expect(element.querySelector('.hero-heading-row .back-link')?.getAttribute('aria-label')).toBe(
      'Back to all masks'
    );
    expect(element.querySelector('.hero-heading-row #mask-name')?.textContent).toContain(
      PROFILE.name
    );
    expect(element.querySelector('.hero-heading-row')?.children.length).toBe(2);
    expect(element.querySelector('.mask-hero')?.textContent).not.toContain('Complete analysis');
    expect(element.querySelector('.mask-hero')?.textContent).not.toContain(
      'A transparent analysis'
    );
    expect(element.querySelector('.score-panel')?.textContent).not.toContain(
      'Text satisfaction'
    );
    const coverage = element.querySelector('.coverage-facts');
    const showcase = element.querySelector('.hero-showcase');
    expect(
      Boolean(
        coverage &&
          showcase &&
          coverage.compareDocumentPosition(showcase) & Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBeTrue();
    (element.querySelector('[data-tab="reviews"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('[data-tab="reviews"]')?.textContent).toContain('Reviews');
    expect(element.querySelector('.review-explorer')?.textContent).toContain(
      'What reviewers are saying'
    );
    expect(element.querySelector('.review-aspect')?.textContent).toContain('All reviews');
    expect(element.querySelector('.see-all-aspects')?.textContent).toContain('See all aspects');
    expect(element.querySelector('.secondary-aspects')).toBeNull();
    expect(element.querySelectorAll('.review-card').length).toBeGreaterThan(0);
    (element.querySelector('.see-all-aspects') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.secondary-aspects')).toBeTruthy();

    (element.querySelector('[data-tab="fit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.context-favorable')?.textContent).toContain('Side sleepers');
  });

  it('places the review tabs below pricing and switches between section groups', () => {
    const element: HTMLElement = fixture.nativeElement;
    const purchaseSection = element.querySelector('.purchase-section');
    const tabs = element.querySelector('.analysis-tabs');
    expect(
      Boolean(
        purchaseSection &&
          tabs &&
          purchaseSection.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBeTrue();
    expect(element.querySelector('.interaction-analysis')).toBeTruthy();
    expect(element.querySelector('.analysis-section')).toBeNull();

    (element.querySelector('[data-tab="components"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('[data-tab="components"]')?.getAttribute('aria-selected')).toBe(
      'true'
    );
    expect(element.querySelector('[aria-labelledby="parts-title"]')).toBeTruthy();
    expect(element.querySelector('[aria-labelledby="aspects-title"]')).toBeNull();
    expect(element.querySelector('.interaction-analysis')).toBeNull();
  });

  it('renders a clean key insights heading and tone-aware interaction cards', () => {
    const element: HTMLElement = fixture.nativeElement;
    const interaction = element.querySelector('.interaction-analysis');
    expect(interaction?.querySelector('.interaction-title')?.textContent).toContain(
      'Key Insights'
    );
    expect(interaction?.querySelector('.eyebrow')?.textContent).toContain(
      'User–mask interaction analysis'
    );
    expect(interaction?.querySelector('.interaction-method')?.textContent).toContain(
      'Specific user-mask interaction commonly experienced through multiple reviews'
    );
    expect(interaction?.textContent).toContain('Cushion');
    expect(interaction?.textContent).toContain('Nasal Pillows at Nostrils: Comfort');
    expect(interaction?.textContent).not.toContain('Comfort and Discomfort');
    expect(interaction?.textContent).not.toContain('What the broad scores do not explain');
    expect(interaction?.textContent).not.toContain(PROFILE.interactionSummary[0]);
    expect(interaction?.querySelector('.interaction-summary')).toBeNull();
    expect(element.querySelector('.at-a-glance')).toBeNull();
  });

  it('loads by stable mask slug', () => {
    expect(data.getProfile).toHaveBeenCalledWith(PROFILE.slug);
    expect(data.getGallery).toHaveBeenCalledWith(PROFILE.slug);
    expect(data.getPrices).toHaveBeenCalledWith(PROFILE.slug);
  });

  it('renders every gallery image and advances the carousel', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.gallery-thumbnail').length).toBe(GALLERY.images.length);
    expect(element.querySelector('.gallery-image')?.getAttribute('src')).toBe(
      GALLERY.images[0].src
    );

    (element.querySelector('.gallery-nav-next') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('.gallery-image')?.getAttribute('src')).toBe(
      GALLERY.images[1].src
    );
    expect(element.querySelector('.gallery-meta')?.textContent).toContain('1800CPAP.COM');
  });

  it('renders the cheapest retailer and all current offers', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.cheapest-card > span')?.textContent).toContain('Current price');
    expect(element.querySelector('.cheapest-card')?.textContent).toContain('Example Store');
    expect(element.querySelector('.cheapest-card')?.textContent).toContain('$149.00');
    expect(element.querySelectorAll('.offer-table tbody tr').length).toBe(2);
    expect(element.querySelector('.offer-table thead')?.textContent).not.toContain('Configuration');
    expect(element.querySelector('.offer-table thead')?.textContent).not.toContain('Checked');
    expect(element.querySelector('.retailer-overall-cell')?.textContent).toContain('A-');
    (element.querySelector('.offer-table tbody tr') as HTMLTableRowElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.offer-table tbody tr')?.classList).toContain(
      'retailer-row-selected'
    );
    expect(
      element.querySelector('.retailer-detail-trigger')?.getAttribute('aria-expanded')
    ).toBe('true');
    expect(element.querySelector('.retailer-detail-panel')?.textContent).toContain('Example Store');
    expect(element.querySelector('.cheapest-card > .retailer-detail-panel')).toBeTruthy();
    expect(element.querySelector('.offer-table-wrap > .retailer-detail-panel')).toBeNull();
    expect(element.querySelector('.retailer-detail-panel')?.textContent).not.toContain('Reviews analyzed');
    expect(element.querySelector('.retailer-detail-panel')?.textContent).not.toContain('Masks covered');
    expect(element.querySelector('.retailer-subscore-grid')?.textContent).toContain('Service');
    expect(element.querySelector('.retailer-subscore-grid')?.textContent).toContain('Shipping');
    expect(element.querySelector('.price-history')).toBeNull();

    (element.querySelectorAll('.offer-table tbody tr')[1] as HTMLTableRowElement).click();
    fixture.detectChanges();
    const selectedPrice = element.querySelector('.cheapest-card');
    expect(selectedPrice?.textContent).toContain('Second Store');
    expect(selectedPrice?.textContent).toContain('$179.00');
    expect(selectedPrice?.textContent).toContain('Previously $199.00');
    expect(selectedPrice?.textContent).toContain('AirFit F20 mask kit');
    expect(selectedPrice?.textContent).toContain('Large');
    expect(selectedPrice?.querySelector('a')?.getAttribute('href')).toBe(
      'https://second.example.test/f20'
    );
    expect(element.querySelectorAll('.offer-table tbody tr')[1].classList).toContain(
      'retailer-row-selected'
    );
  });

  it('filters retailer prices by size and defaults to included headgear', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.price-choice-list button.active')?.textContent).toContain(
      'Included'
    );
    expect(element.textContent).toContain('Any');
    expect(element.textContent).not.toContain('One Size');
    expect(element.querySelector('.size-range-list')).toBeNull();
    expect(element.querySelector('.selected-price-range')).toBeNull();

    const largeButton = [...element.querySelectorAll<HTMLButtonElement>('.price-choice-list button')]
      .find((button) => button.textContent?.trim() === 'Large');
    largeButton?.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.offer-table tbody tr').length).toBe(1);
    expect(element.querySelector('.cheapest-card')?.textContent).toContain('Second Store');

    const withoutHeadgear = [...element.querySelectorAll<HTMLButtonElement>('.price-choice-list button')]
      .find((button) => button.textContent?.trim() === 'Not included');
    withoutHeadgear?.click();
    fixture.detectChanges();
    expect(element.querySelector('.price-empty')?.textContent).toContain('exact configuration');
  });

  it('combines the neutral size choice and one-size offers under one label', () => {
    const component = fixture.componentInstance as any;
    component.prices.set({
      ...PRICES,
      offers: [
        ...PRICES.offers,
        {
          ...PRICES.cheapestOffer!,
          variantId: 'complete-one-size',
          variantName: 'One Size',
          configuration: {
            ...PRICES.cheapestOffer!.configuration,
            size: 'One Size'
          }
        }
      ]
    });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const sizeButtons = [...element.querySelectorAll<HTMLButtonElement>(
      '.price-filter-group-wide button'
    )].map((button) => button.textContent?.trim());
    expect(sizeButtons.filter((label) => label === 'Any').length).toBe(1);
    expect(sizeButtons).not.toContain('Any size');
    expect(sizeButtons).not.toContain('One Size');
  });

  it('shows a load error state', () => {
    data.getProfile.and.returnValue(throwError(() => new Error('missing')));
    params.next(convertToParamMap({ maskSlug: 'missing-mask' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.state-panel').textContent).toContain(
      'couldn’t load'
    );
  });
});
