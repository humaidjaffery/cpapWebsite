import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodySiteFinding } from '../mask-data';
import { buildHeatmapRegions } from './heatmap-regions';
import { buildHeatmapGradient, FaceComfortHeatmap } from './face-comfort-heatmap';

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
  it('uses a continuous color scale for distinct comfort ratios', () => {
    const eyes = buildHeatmapGradient(26, 23, 'strong');
    const cheeks = buildHeatmapGradient(226, 83, 'strong');
    const nostrils = buildHeatmapGradient(96, 160, 'strong');

    expect(new Set([eyes.centerColor, cheeks.centerColor, nostrils.centerColor]).size).toBe(3);
    expect(nostrils.centerHue).toBeLessThan(eyes.centerHue);
    expect(cheeks.centerHue).toBeGreaterThan(eyes.centerHue);
  });

  it('keeps strong evidence more solid than limited evidence', () => {
    const strong = buildHeatmapGradient(20, 80, 'strong');
    const limited = buildHeatmapGradient(20, 80, 'limited');

    expect(strong.solidStop).toBeGreaterThan(limited.solidStop);
    expect(strong.centerColor).toBe(limited.centerColor);
  });

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
    const content = fixture.nativeElement.querySelector('.heatmap-content');
    expect(expandedView.textContent).toContain('Nose bridge');
    expect(expandedView.textContent).toContain('14 discomfort mentions');
    expect(expandedView.textContent).toContain('Nose Bridge felt sore in the morning.');
    expect(content.classList).toContain('has-selection');
    expect(content.children[0].classList).toContain('heatmap-stage');
    expect(content.children[1]).toBe(expandedView);
  });

  it('removes Summary Widgets while the Expanded Evidence View is open', () => {
    const noseBridge = fixture.nativeElement.querySelector(
      '[data-region-id="nose-bridge"]'
    ) as HTMLElement;

    noseBridge.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-testid="summary-widget"]')).toHaveSize(0);
  });

  it('centers the Expanded Evidence View vertically beside the face', () => {
    const noseBridge = fixture.nativeElement.querySelector(
      '[data-region-id="nose-bridge"]'
    ) as HTMLElement;

    noseBridge.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.heatmap-content') as HTMLElement;
    expect(getComputedStyle(content).alignItems).toBe('center');
  });

  it('renders the realistic face beneath localized SVG heat regions', () => {
    const faceImage = fixture.nativeElement.querySelector('.face-image') as SVGImageElement;
    const heatRegions = fixture.nativeElement.querySelectorAll('.region-heat');

    expect(faceImage.getAttribute('href')).toBe('/images/face-heatmap-base.png');
    expect(heatRegions.length).toBeGreaterThan(0);
  });

  it('aligns focal Heatmap Regions with the corresponding image anatomy', () => {
    const centerOf = (regionId: string, pathIndex = 0) => {
      const paths = fixture.nativeElement.querySelectorAll(
        `[data-region-id="${regionId}"] .region-hit`
      ) as NodeListOf<SVGGraphicsElement>;
      const bounds = paths[pathIndex].getBBox();
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    };

    const leftEye = centerOf('eyes');
    expect(leftEye.x).toBeCloseTo(490, 0);
    expect(leftEye.y).toBeCloseTo(423, 0);
    expect(centerOf('nostrils')).toEqual(jasmine.objectContaining({ x: 561, y: 556 }));
    expect(centerOf('ears')).toEqual(jasmine.objectContaining({ x: 356, y: 469 }));
    expect(centerOf('ears', 1)).toEqual(jasmine.objectContaining({ x: 828, y: 469 }));
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

  it('gives Summary Widgets distinct colors for distinct ratios', () => {
    const detailedViewButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.includes('Detailed view'));

    detailedViewButton?.click();
    fixture.detectChanges();

    const colors = Array.from(
      fixture.nativeElement.querySelectorAll('.summary-widget .summary-tone') as NodeListOf<HTMLElement>
    ).map((tone) => tone.style.getPropertyValue('--region-color'));
    expect(new Set(colors).size).toBe(2);
  });
});
