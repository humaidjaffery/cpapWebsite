import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { RetailerIndex } from '../retailer-data';
import { RetailerDataService } from '../retailer-data.service';
import { Retailers } from './retailers';

const INDEX: RetailerIndex = {
  schemaVersion: 1,
  generatedAt: '2026-08-02T00:00:00Z',
  verifiedOn: '2026-08-02',
  methodology: {
    reviews: 'Review method.',
    serviceClaims: 'Service method.',
    serviceScore: 'Score method.',
    policies: 'Policy method.'
  },
  profiles: [
    {
      slug: 'example-cpap',
      name: 'Example CPAP',
      websiteUrl: 'https://example.com',
      reviewEvidence: {
        scrapedReviewCount: 100,
        eligibleReviewCount: 90,
        processedReviewCount: 90,
        averageRating: 4.5,
        ratingCount: 90,
        maskCount: 12,
        reviewDateStart: '2025-01-01',
        reviewDateEnd: '2026-01-01',
        serviceScopedReviewCount: 30,
        serviceClaimReviewCount: 25,
        serviceScore: 82,
        evidenceStrength: 'moderate'
      },
      serviceAspects: [
        {
          aspect: 'shipping',
          label: 'Shipping',
          reviewCount: 25,
          averageSentiment: 8.2,
          score: 82,
          positiveReviews: 22,
          mixedReviews: 1,
          negativeReviews: 2,
          evidenceStrength: 'moderate',
          positiveEvidence: [
            {
              text: 'The order arrived quickly.',
              maskName: 'Example Mask',
              productUrl: 'https://example.com/mask',
              reviewDate: '2026-01-01'
            }
          ],
          negativeEvidence: []
        }
      ],
      policies: [
        {
          key: 'returns',
          title: 'Returns and mask trials',
          summary: 'Unopened items can be returned.',
          facts: [{ label: 'Window', value: '30 days' }],
          sources: [{ title: 'Return policy', url: 'https://example.com/returns' }]
        }
      ]
    }
  ]
};

describe('Retailers', () => {
  let fixture: ComponentFixture<Retailers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Retailers],
      providers: [
        provideRouter([]),
        { provide: RetailerDataService, useValue: { getIndex: () => of(INDEX) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Retailers);
    fixture.detectChanges();
  });

  it('renders retailer evidence, policies, and official sources', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Example CPAP');
    expect(element.textContent).toContain('82/100');
    expect(element.textContent).toContain('The order arrived quickly.');
    expect(element.textContent).toContain('30 days');
    expect(element.querySelector('.policy-sources a')?.getAttribute('href')).toBe(
      'https://example.com/returns'
    );
  });
});
