import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { MaskPrices, MaskProfile } from '../mask-data';
import { MaskDataService } from '../mask-data.service';
import { MaskDetail } from './mask-detail';

const PROFILE: MaskProfile = {
  schemaVersion: 2,
  slug: 'resmed-airfit-f20',
  name: 'ResMed AirFit F20',
  catalogOrder: 2,
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
    compositeScore: 84,
    ratingComponent: { average: 4.2, score: 84, reviewCount: 100, weight: 0.6 },
    textSatisfactionComponent: {
      averageSentiment: 8.4,
      score: 84,
      reviewCount: 80,
      weight: 0.4
    }
  },
  dimensions: [
    {
      id: 'comfort',
      label: 'Comfort',
      score: 82,
      averageSentiment: 8.2,
      reviewCount: 60,
      reviewShare: 0.6,
      positiveReviews: 50,
      mixedReviews: 5,
      negativeReviews: 5,
      evidenceStrength: 'moderate',
      positiveEvidence: [],
      negativeEvidence: []
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
      averageSentiment: 8.5,
      reviewCount: 20,
      reviewShare: 0.2,
      positiveReviews: 18,
      mixedReviews: 1,
      negativeReviews: 1,
      evidenceStrength: 'moderate',
      positiveEvidence: [],
      negativeEvidence: [],
      sourceContexts: ['side_sleeping'],
      classification: 'favorable',
      limitedEvidence: false
    }
  ],
  contextAspectMatrix: [],
  bestFor: ['side-sleepers'],
  mayNotSuit: [],
  bodySites: [],
  interactionSummary: [
    'The clearest favorable pattern was sleep position compatibility among side sleepers.'
  ],
  interactionInsights: [
    {
      id: 'context|side-sleepers|sleep_position_compatibility',
      label: 'Side sleepers: Sleep Position Compatibility',
      kind: 'patient-context',
      tone: 'favorable',
      description:
        'Among side sleepers, reports about sleep position compatibility leaned favorable.',
      contextId: 'side-sleepers',
      contextLabel: 'Side sleepers',
      aspectId: 'sleep_position_compatibility',
      aspectLabel: 'Sleep Position Compatibility',
      parts: [{ id: 'cushion', label: 'Cushion', reviewCount: 12 }],
      bodySites: [{ id: 'face', label: 'Face', reviewCount: 8 }],
      contexts: [],
      score: 85,
      averageSentiment: 8.5,
      reviewCount: 20,
      reviewShare: 0.2,
      positiveReviews: 18,
      mixedReviews: 1,
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
  schemaVersion: 1,
  mask: PROFILE.name,
  slug: PROFILE.slug,
  generatedAt: '2026-08-02T12:00:00Z',
  status: 'available',
  cheapestOffer: {
    retailer: 'Example Store',
    productName: 'AirFit F20 complete mask',
    productUrl: 'https://example.test/f20',
    variantName: 'Complete Mask / Medium',
    priceCents: 14900,
    price: '$149.00',
    currency: 'USD',
    inStock: true,
    observedAt: '2026-08-02T12:00:00Z',
    configurationNote: ''
  },
  offers: [],
  priceHistory: [],
  methodology: 'Shipping and tax are not included.'
};
PRICES.offers = [PRICES.cheapestOffer!];

describe('MaskDetail', () => {
  let fixture: ComponentFixture<MaskDetail>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let data: jasmine.SpyObj<MaskDataService>;

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ maskSlug: PROFILE.slug }));
    data = jasmine.createSpyObj<MaskDataService>('MaskDataService', ['getProfile', 'getPrices']);
    data.getProfile.and.returnValue(of(PROFILE));
    data.getPrices.and.returnValue(of(PRICES));

    await TestBed.configureTestingModule({
      imports: [MaskDetail],
      providers: [
        provideRouter([]),
        { provide: MaskDataService, useValue: data },
        { provide: ActivatedRoute, useValue: { paramMap: params } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MaskDetail);
    fixture.detectChanges();
  });

  it('renders the mask score, dimensions, and favorable patient context', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toContain(PROFILE.name);
    expect(element.querySelector('.score-orb')?.textContent).toContain('84');
    expect(element.querySelector('.metric-card')?.textContent).toContain('Comfort');
    expect(element.querySelector('.context-favorable')?.textContent).toContain('Side sleepers');
  });

  it('renders nuanced interaction evidence before the at-a-glance section', () => {
    const element: HTMLElement = fixture.nativeElement;
    const interaction = element.querySelector('.interaction-analysis');
    const glance = element.querySelector('.at-a-glance');
    expect(interaction?.textContent).toContain('Cushion');
    expect(interaction?.textContent).toContain(PROFILE.interactionSummary[0]);
    expect(
      Boolean(interaction && glance && interaction.compareDocumentPosition(glance) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBeTrue();
  });

  it('loads by stable mask slug', () => {
    expect(data.getProfile).toHaveBeenCalledWith(PROFILE.slug);
    expect(data.getPrices).toHaveBeenCalledWith(PROFILE.slug);
  });

  it('renders the cheapest retailer and all current offers', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.cheapest-card')?.textContent).toContain('Example Store');
    expect(element.querySelector('.cheapest-card')?.textContent).toContain('$149.00');
    expect(element.querySelectorAll('.offer-table tbody tr').length).toBe(1);
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
