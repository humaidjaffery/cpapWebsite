import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { MaskIndex } from './mask-data';
import { MaskDataService } from './mask-data.service';
import { CpapWorld } from './cpapworld';

const INDEX: MaskIndex = {
  schemaVersion: 3,
  source: {
    eligibleReviews: 100,
    processedReviews: 100,
    completedParts: [1],
    correctionsApplied: 0
  },
  masks: [
    {
      name: 'ResMed AirFit P10',
      slug: 'resmed-airfit-p10',
      catalogOrder: 1,
      search: {
        aliases: ['AirFit P10 Nasal Pillow CPAP Mask', 'P10 mask'],
        abbreviations: ['P10'],
        maskTypes: ['Nasal Pillow', 'Nasal']
      },
      coverage: {
        status: 'complete',
        processedReviews: 100,
        eligibleReviews: 100,
        processedShare: 1,
        retailerCount: 2,
        reviewDateStart: null,
        reviewDateEnd: null
      },
      overall: {
        score: 87,
        grade: 'A-',
        calculation: '90% star rating + 10% review-text satisfaction',
        ratingComponent: { average: 4.4, score: 85, reviewCount: 100, weight: 0.9 },
        textSatisfactionComponent: {
          averageSentiment: 8.8,
          score: 88,
          reviewCount: 80,
          weight: 0.1
        }
      },
      cardGrades: [
        {
          id: 'fit-and-sizing',
          label: 'Fit',
          description: 'How reliably it fits.',
          grade: 'B+',
          score: 82,
          reviewCount: 70,
          evidenceStrength: 'moderate'
        },
        {
          id: 'comfort',
          label: 'Comfort',
          description: 'How it feels.',
          grade: 'A-',
          score: 86,
          reviewCount: 70,
          evidenceStrength: 'moderate'
        },
        {
          id: 'seal-and-leaks',
          label: 'Seal',
          description: 'How reliably it seals.',
          grade: 'B',
          score: 76,
          reviewCount: 60,
          evidenceStrength: 'moderate'
        },
        {
          id: 'sleep-compatibility',
          label: 'Stability',
          description: 'How well it stays put while moving.',
          grade: 'B-',
          score: 72,
          reviewCount: 40,
          evidenceStrength: 'moderate'
        },
        {
          id: 'ease-of-use',
          label: 'Ease of Use',
          description: 'Putting on, removing, adjusting, and cleaning.',
          grade: 'A',
          score: 91,
          reviewCount: 50,
          evidenceStrength: 'moderate'
        },
        {
          id: 'durability',
          label: 'Durability',
          description: 'How it holds up.',
          grade: 'C+',
          score: 68,
          reviewCount: 30,
          evidenceStrength: 'moderate'
        }
      ],
      bestReportedFor: [
        {
          id: 'side-sleepers',
          label: 'Side sleepers',
          reviewCount: 25,
          evidenceStrength: 'moderate',
          reason: 'Sleep Position Compatibility'
        }
      ],
      extraCaution: [],
      topStrengths: [],
      topConcerns: []
    }
  ]
};

describe('CpapWorld', () => {
  let component: CpapWorld;
  let fixture: ComponentFixture<CpapWorld>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CpapWorld],
      providers: [
        provideRouter([]),
        {
          provide: MaskDataService,
          useValue: {
            getIndex: () => of(INDEX),
            getPriceIndex: () =>
              of({
                schemaVersion: 1,
                generatedAt: '2026-08-03T00:00:00Z',
                masks: [
                  {
                    name: 'ResMed AirFit P10',
                    slug: 'resmed-airfit-p10',
                    offerCount: 2,
                    cheapestOffer: {
                      retailer: 'Example Store',
                      productName: 'P10 complete mask',
                      productUrl: 'https://example.test/p10',
                      variantName: 'Standard',
                      priceCents: 6900,
                      price: '$69.00',
                      currency: 'USD',
                      inStock: true,
                      observedAt: '2026-08-03T00:00:00Z',
                      configurationNote: ''
                    }
                  }
                ]
              })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CpapWorld);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('displays the evidence-backed catalog card', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toContain('CPAP Library');
    expect(element.textContent).not.toContain('CPAP World');
    const card = element.querySelector('.mask-card:not(.custom-mask-card)');
    expect(card?.textContent).toContain('ResMed AirFit P10');
    expect(card?.textContent).toContain('100 reviews analyzed');
    expect(card?.textContent).toContain('Stability');
    expect(card?.textContent).toContain('Ease of Use');
    expect(card?.textContent).not.toContain('stays put as you move');
    expect(card?.textContent).not.toContain('on, off, adjust & clean');
    expect(card?.textContent).toContain('Side sleepers');
    expect(card?.textContent).toContain('Cheapest');
    expect(card?.textContent).toContain('$69.00');
    expect(card?.querySelector('.catalog-grade')?.textContent).toContain('A-');
    expect(card?.getAttribute('href')).toContain('/cpaplibrary/masks/resmed-airfit-p10');
    expect(card?.querySelector('img')?.getAttribute('src')).toBe(
      '/images/masks/resmed-airfit-p10.webp'
    );
  });

  it('shows the DreamSeal header brand and CTA', () => {
    const brand = fixture.nativeElement.querySelector('.brand');
    const cta = fixture.nativeElement.querySelector('.header-waitlist a');
    expect(brand.textContent).toContain('DreamSeal');
    expect(cta.textContent).toContain('Win Lifetime Free Custom Masks!');
    expect(cta.getAttribute('href')).toBe('/');
    expect(fixture.nativeElement.querySelector('.header-waitlist input')).toBeNull();
  });

  it('filters masks by abbreviation, alias, and mask type', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');

    for (const query of ['P10', 'P10 mask', 'nasal pillow']) {
      input.value = query;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelectorAll('.mask-card:not(.custom-mask-card)').length
      ).toBe(1);
      expect(fixture.nativeElement.querySelector('.result-count').textContent).toContain('1 mask');
      expect(fixture.nativeElement.querySelector('.custom-mask-card form')).toBeTruthy();
    }

    input.value = 'not a real mask';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.no-results').textContent).toContain(
      'No matching masks'
    );
  });
});
