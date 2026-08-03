import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { MaskIndex } from './mask-data';
import { MaskDataService } from './mask-data.service';
import { CpapWorld } from './cpapworld';

const INDEX: MaskIndex = {
  schemaVersion: 1,
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
        compositeScore: 88,
        ratingComponent: { average: 4.4, score: 88, reviewCount: 100, weight: 0.6 },
        textSatisfactionComponent: {
          averageSentiment: 8.8,
          score: 88,
          reviewCount: 80,
          weight: 0.4
        }
      },
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
        { provide: MaskDataService, useValue: { getIndex: () => of(INDEX) } }
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
    const card = element.querySelector('.mask-card');
    expect(card?.textContent).toContain('ResMed AirFit P10');
    expect(card?.textContent).toContain('100 reviews analyzed');
    expect(card?.getAttribute('href')).toContain('/cpapworld/masks/resmed-airfit-p10');
  });

  it('shows the DreamSeal header brand and CTA', () => {
    const brand = fixture.nativeElement.querySelector('.brand');
    const cta = fixture.nativeElement.querySelector('.header-cta');
    expect(brand.textContent).toContain('DreamSeal');
    expect(cta.textContent).toContain('Win Lifetime Free Custom Masks!');
  });
});
