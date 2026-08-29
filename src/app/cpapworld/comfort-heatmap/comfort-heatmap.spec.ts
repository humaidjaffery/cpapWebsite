import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodySiteFinding } from '../mask-data';
import { buildHeatmapRegions } from './heatmap-regions';
import { FaceComfortHeatmap } from './face-comfort-heatmap';

function bodySite(
  id: string,
  label: string,
  positiveReviews: number,
  complaintReviews: number
): BodySiteFinding {
  const reviewCount = positiveReviews + complaintReviews;

  return {
    id,
    label,
    score: Math.round((positiveReviews / reviewCount) * 100),
    grade: 'B',
    averageSentiment: 6,
    reviewCount,
    reviewShare: 0.25,
    positiveReviews,
    neutralReviews: 0,
    negativeReviews: complaintReviews,
    positiveShare: positiveReviews / reviewCount,
    negativeShare: complaintReviews / reviewCount,
    evidenceStrength: 'moderate',
    complaintReviews,
    complaintShare: complaintReviews / reviewCount,
    complaintSeverity: 0.5,
    complaintAspects: [],
    involvedParts: [],
    associatedParts: [],
    associatedContexts: [],
    associatedBodySites: [],
    positiveEvidence: [
      {
        text: `${label} felt comfortable all night.`,
        retailer: 'Example Store',
        productUrl: 'https://example.test/positive'
      }
    ],
    negativeEvidence: [
      {
        text: `${label} felt sore in the morning.`,
        retailer: 'Example Store',
        productUrl: 'https://example.test/negative'
      }
    ]
  };
}

describe('comfort heatmap evidence', () => {
  it('combines related body sites into one patient-facing Heatmap Region', () => {
    const regions = buildHeatmapRegions([
      bodySite('nostrils', 'Nostrils', 8, 3),
      bodySite('nares', 'Nares', 4, 2),
      bodySite('nose', 'Nose', 2, 12)
    ]);

    const nostrils = regions.find((region) => region.id === 'nostrils');

    expect(nostrils).toEqual(
      jasmine.objectContaining({
        positiveReviews: 12,
        complaintReviews: 5,
        evidenceCount: 17,
        tone: 'mixed'
      })
    );
    expect(nostrils?.bodySites.map((site) => site.id)).toEqual(['nostrils', 'nares']);
  });

  it('omits Heatmap Regions without sufficient evidence', () => {
    const regions = buildHeatmapRegions([bodySite('chin', 'Chin', 1, 3)]);

    expect(regions.some((region) => region.id === 'chin')).toBeFalse();
  });

  it('uses associated mask components in the Expanded Evidence View model', () => {
    const nose = bodySite('nose', 'Nose', 8, 6);
    nose.involvedParts = [{ id: 'frame', label: 'Frame', reviewCount: 3 }];
    nose.associatedParts = [{ id: 'cushion', label: 'Cushion', reviewCount: 9 }];

    const region = buildHeatmapRegions([nose]).find((item) => item.id === 'nose');

    expect(region?.associatedParts).toEqual([
      { id: 'cushion', label: 'Cushion', reviewCount: 9 }
    ]);
  });

  it('does not draw evidence outside the face, head, or neck', () => {
    expect(buildHeatmapRegions([bodySite('chest', 'Chest', 1, 8)])).toEqual([]);
  });
});

describe('FaceComfortHeatmap', () => {
  let fixture: ComponentFixture<FaceComfortHeatmap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FaceComfortHeatmap] }).compileComponents();
    fixture = TestBed.createComponent(FaceComfortHeatmap);
    fixture.componentRef.setInput('maskName', 'Example Mask');
    fixture.componentRef.setInput('bodySites', [
      bodySite('nose_bridge', 'Nose Bridge', 2, 14),
      bodySite('cheeks', 'Cheeks', 12, 2)
    ]);
    fixture.detectChanges();
  });

  it('opens an Expanded Evidence View when a Heatmap Region is selected', () => {
    const noseBridge = fixture.nativeElement.querySelector(
      '[data-region-id="nose-bridge"]'
    ) as HTMLElement;

    noseBridge.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const expandedView = fixture.nativeElement.querySelector('[data-testid="expanded-evidence"]');
    expect(expandedView.textContent).toContain('Nose bridge');
    expect(expandedView.textContent).toContain('14 discomfort mentions');
    expect(expandedView.textContent).toContain('Nose Bridge felt sore in the morning.');
  });

  it('shows Summary Widgets for all supported regions in Detailed View', () => {
    const detailedViewButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.includes('Detailed view'));

    detailedViewButton?.click();
    fixture.detectChanges();

    const summaries = fixture.nativeElement.querySelectorAll('[data-testid="summary-widget"]');
    expect(summaries.length).toBe(2);
    expect(detailedViewButton?.getAttribute('aria-pressed')).toBe('true');
  });
});
