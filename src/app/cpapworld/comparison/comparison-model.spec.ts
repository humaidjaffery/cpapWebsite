import {
  BodySiteFinding,
  ContextFinding,
  MaskPrices,
  MaskProfile,
  MetricFinding,
  PartFinding
} from '../mask-data';
import { buildMaskComparison, DEFAULT_COMPARISON_CRITERIA } from './comparison-model';

function finding(
  id: string,
  label: string,
  score: number,
  reviewCount = 20
): MetricFinding {
  return {
    id,
    label,
    score,
    grade: score >= 80 ? 'A-' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D',
    averageSentiment: score / 10,
    reviewCount,
    reviewShare: reviewCount / 100,
    positiveReviews: Math.round(reviewCount * 0.7),
    neutralReviews: 0,
    negativeReviews: Math.round(reviewCount * 0.3),
    evidenceStrength: reviewCount < 10 ? 'limited' : 'moderate',
    positiveEvidence: [],
    negativeEvidence: []
  };
}

function profile(
  slug: string,
  processedReviews: number,
  dimensions: MetricFinding[],
  overrides: Partial<MaskProfile> = {}
): MaskProfile {
  return {
    schemaVersion: 3,
    slug,
    name: slug === 'mask-a' ? 'Mask A' : 'Mask B',
    catalogOrder: 1,
    search: { aliases: [], abbreviations: [], maskTypes: ['Nasal'] },
    coverage: {
      status: 'complete',
      processedReviews,
      eligibleReviews: processedReviews,
      processedShare: 1,
      retailerCount: 2,
      reviewDateStart: null,
      reviewDateEnd: null
    },
    overall: {
      score: 80,
      grade: 'B+',
      calculation: '',
      ratingComponent: { score: 80, reviewCount: processedReviews, weight: 0.9 },
      textSatisfactionComponent: { score: 80, reviewCount: processedReviews, weight: 0.1 }
    },
    dimensions,
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
    },
    ...overrides
  };
}

function prices(slug: string): MaskPrices {
  const offer = (priceCents: number, headgearIncluded: boolean | null, inStock = true) => ({
    retailer: `${priceCents} Store`,
    productName: 'Complete mask',
    productUrl: `https://example.test/${priceCents}`,
    variantName: 'Standard',
    variantId: String(priceCents),
    priceCents,
    price: `$${(priceCents / 100).toFixed(2)}`,
    currency: 'USD',
    inStock,
    observedAt: '2026-08-20T00:00:00Z',
    configurationNote: '',
    configuration: {
      offerType:
        headgearIncluded === true
          ? ('complete' as const)
          : headgearIncluded === false
            ? ('without_headgear' as const)
            : ('unknown' as const),
      headgearIncluded,
      size: 'Medium',
      frameSize: null,
      headgearSize: null,
      fitPack: false,
      options: []
    }
  });
  const offers = [offer(12000, true), offer(9000, true, false), offer(8000, null), offer(7000, false)];
  return {
    schemaVersion: 2,
    mask: slug,
    slug,
    generatedAt: '2026-08-20T00:00:00Z',
    status: 'available',
    defaultHeadgearIncluded: true,
    cheapestOffer: offers[0],
    offers,
    sizeRanges: [],
    priceHistory: [],
    methodology: ''
  };
}

describe('buildMaskComparison', () => {
  it('applies mask-wide eligibility at 49, 50, 99, and 100 processed reviews', () => {
    const dimension = finding('comfort', 'Comfort', 80);

    expect(
      buildMaskComparison(profile('mask-a', 49, [dimension]), prices('mask-a'), profile('mask-b', 100, [dimension]), prices('mask-b'))
        .eligibility.eligible
    ).toBeFalse();

    for (const count of [50, 99]) {
      const model = buildMaskComparison(
        profile('mask-a', count, [dimension]),
        prices('mask-a'),
        profile('mask-b', 100, [dimension]),
        prices('mask-b')
      );
      expect(model.eligibility.eligible).toBeTrue();
      expect(model.maskWarnings).toEqual([
        jasmine.objectContaining({ side: 'left', label: 'Limited evidence' })
      ]);
    }

    expect(
      buildMaskComparison(profile('mask-a', 100, [dimension]), prices('mask-a'), profile('mask-b', 100, [dimension]), prices('mask-b'))
        .maskWarnings
    ).toEqual([]);
  });

  it('classifies subfields at the 9/10-review and 4/5-point boundaries', () => {
    const model = buildMaskComparison(
      profile('mask-a', 100, [
        finding('nine', 'Nine reviews', 80, 9),
        finding('four', 'Four points', 80, 10),
        finding('five', 'Five points', 80, 10)
      ]),
      prices('mask-a'),
      profile('mask-b', 100, [
        finding('nine', 'Nine reviews', 70, 10),
        finding('four', 'Four points', 76, 10),
        finding('five', 'Five points', 75, 10)
      ]),
      prices('mask-b')
    );

    const nine = model.criteria.find((row) => row.id === 'nine')!;
    expect(nine.left.state).toBe('neutral');
    expect(nine.right.state).toBe('neutral');
    expect(nine.left.labels).toContain('Limited evidence');

    const four = model.criteria.find((row) => row.id === 'four')!;
    expect(four.left.labels).toEqual(['Similar']);
    expect(four.right.labels).toEqual(['Similar']);

    const five = model.criteria.find((row) => row.id === 'five')!;
    expect(five.left.labels).toEqual(['Higher rated']);
    expect(five.right.labels).toEqual(['Lower rated']);
  });

  it('keeps missing semantic findings unavailable rather than treating them as a loss', () => {
    const model = buildMaskComparison(
      profile('mask-a', 100, [finding('comfort', 'Comfort', 80)]),
      prices('mask-a'),
      profile('mask-b', 100, []),
      prices('mask-b')
    );

    expect(model.criteria[0].left.state).toBe('unavailable');
    expect(model.criteria[0].right.state).toBe('unavailable');
    expect(model.criteria[0].right.labels).toEqual(['Unavailable']);
  });

  it('provides the default six criteria and permits published alternatives', () => {
    const dimensions = [
      finding('fit-and-sizing', 'Fit & sizing', 80),
      finding('comfort', 'Comfort', 80),
      finding('seal-and-leaks', 'Seal & leaks', 80),
      finding('sleep-compatibility', 'Stability', 80),
      finding('ease-of-use', 'Ease of use', 80),
      finding('airflow-and-noise', 'Airflow & noise', 80),
      finding('skin-and-pain', 'Skin & pain', 80)
    ];
    const model = buildMaskComparison(
      profile('mask-a', 100, dimensions),
      prices('mask-a'),
      profile('mask-b', 100, dimensions),
      prices('mask-b')
    );

    expect(DEFAULT_COMPARISON_CRITERIA).toEqual([
      'fit-and-sizing',
      'comfort',
      'seal-and-leaks',
      'sleep-compatibility',
      'ease-of-use',
      'airflow-and-noise'
    ]);
    expect(model.criteria.map((row) => row.id)).toContain('skin-and-pain');
    expect(DEFAULT_COMPARISON_CRITERIA.every((id) => model.criteria.some((row) => row.id === id)))
      .toBeTrue();
    expect(model).not.toEqual(jasmine.objectContaining({ overall: jasmine.anything() }));
  });

  it('allows different mask types and exposes an explicit notice', () => {
    const dimension = finding('comfort', 'Comfort', 80);
    const model = buildMaskComparison(
      profile('mask-a', 100, [dimension], {
        search: { aliases: [], abbreviations: [], maskTypes: ['Nasal Pillow', 'Nasal'] }
      }),
      prices('mask-a'),
      profile('mask-b', 100, [dimension], {
        search: { aliases: [], abbreviations: [], maskTypes: ['Full Face'] }
      }),
      prices('mask-b')
    );

    expect(model.eligibility.eligible).toBeTrue();
    expect(model.differentMaskTypes).toBeTrue();
  });

  it('aligns user-fit and body-area evidence by stable identifiers', () => {
    const contextA = {
      ...finding('side-sleepers', 'Side sleepers', 82, 20),
      positiveEvidence: [
        { text: 'Stayed sealed while side sleeping', retailer: 'Store', productUrl: '#' }
      ],
      sourceContexts: ['side_sleeping'],
      classification: 'favorable' as const,
      limitedEvidence: false
    } satisfies ContextFinding;
    const contextB = {
      ...finding('side-sleepers', 'Side sleepers', 55, 18),
      sourceContexts: ['side_sleeping'],
      classification: 'mixed' as const,
      limitedEvidence: false
    } satisfies ContextFinding;
    const bodyA = {
      ...finding('nose', 'Nose', 75, 40),
      positiveReviews: 30,
      negativeReviews: 10,
      complaintReviews: 10,
      complaintShare: 0.1,
      complaintSeverity: 0.3,
      complaintAspects: [],
      involvedParts: []
    } satisfies BodySiteFinding;
    const bodyB = {
      ...finding('nose', 'Nose', 45, 20),
      positiveReviews: 8,
      negativeReviews: 12,
      complaintReviews: 12,
      complaintShare: 0.12,
      complaintSeverity: 0.5,
      complaintAspects: [],
      involvedParts: []
    } satisfies BodySiteFinding;
    const model = buildMaskComparison(
      profile('mask-a', 400, [], { contexts: [contextA], bodySites: [bodyA] }),
      prices('mask-a'),
      profile('mask-b', 100, [], { contexts: [contextB], bodySites: [bodyB] }),
      prices('mask-b')
    );

    expect(model.contexts[0].left?.group).toBe('Better reported for');
    expect(model.contexts[0].left?.reason).toBe('Stayed sealed while side sleeping');
    expect(model.contexts[0].right?.group).toBe('Mixed results');
    expect(model.bodyAreas[0].left?.positiveProportion).toBe(0.75);
    expect(model.bodyAreas[0].right?.positiveProportion).toBe(0.4);
    expect(model.bodyAreas[0].left?.complaintSeverity).toBe(0.3);
    expect(model.bodyAreas[0].right?.complaintSeverity).toBe(0.5);
    expect(model.bodyAreas[0].left?.state).toBe('higher');
    expect(model.bodyAreas[0].right?.state).toBe('lower');
  });

  it('promotes only qualified notable component findings', () => {
    const praised = {
      ...finding('cushion', 'Cushion', 85, 30),
      positiveShare: 0.8,
      negativeShare: 0.1,
      praisedAspects: [],
      criticizedAspects: []
    } satisfies PartFinding;
    const lowEvidence = {
      ...finding('clip', 'Clip', 95, 9),
      positiveShare: 0.95,
      negativeShare: 0.05,
      praisedAspects: [],
      criticizedAspects: []
    } satisfies PartFinding;
    const model = buildMaskComparison(
      profile('mask-a', 100, [], { parts: [praised, lowEvidence] }),
      prices('mask-a'),
      profile('mask-b', 100, []),
      prices('mask-b')
    );

    expect(model.components.left.map((item) => item.finding.id)).toContain('cushion');
    expect(model.components.left.map((item) => item.finding.id)).not.toContain('clip');
  });

  it('selects the lowest in-stock like-for-like price and never substitutes unknown headgear', () => {
    const dimension = finding('comfort', 'Comfort', 80);
    const withHeadgear = buildMaskComparison(
      profile('mask-a', 100, [dimension]),
      prices('mask-a'),
      profile('mask-b', 100, [dimension]),
      prices('mask-b')
    );
    expect(withHeadgear.pricing.left.offer?.priceCents).toBe(12000);

    const withoutHeadgear = buildMaskComparison(
      profile('mask-a', 100, [dimension]),
      prices('mask-a'),
      profile('mask-b', 100, [dimension]),
      prices('mask-b'),
      { includeHeadgear: false }
    );
    expect(withoutHeadgear.pricing.left.offer?.priceCents).toBe(7000);

    const unavailable = prices('mask-b');
    unavailable.offers = unavailable.offers.filter(
      (offer) => offer.configuration.headgearIncluded !== false
    );
    const noOffer = buildMaskComparison(
      profile('mask-a', 100, [dimension]),
      prices('mask-a'),
      profile('mask-b', 100, [dimension]),
      unavailable,
      { includeHeadgear: false }
    );
    expect(noOffer.pricing.right.offer).toBeNull();
    expect(noOffer.pricing.right.message).toBe('There are no offers without headgear');
  });
});
