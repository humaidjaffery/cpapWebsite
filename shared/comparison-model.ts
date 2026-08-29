export const MIN_COMPARISON_REVIEWS = 50;
export const LIMITED_COMPARISON_REVIEWS = 100;
export const MIN_COMPARISON_FINDING_REVIEWS = 10;
export const MEANINGFUL_COMPARISON_DIFFERENCE = 5;

export interface EvidenceExcerpt {
  text: string;
}

export interface MetricFinding {
  id: string;
  label: string;
  score: number;
  grade: string;
  reviewCount: number;
  reviewShare: number;
  positiveReviews: number;
  negativeReviews: number;
  evidenceStrength: string;
  positiveShare?: number;
  negativeShare?: number;
  positiveEvidence: EvidenceExcerpt[];
  negativeEvidence: EvidenceExcerpt[];
}

export interface ComparisonSummary {
  decisionTakeaway: string;
  reasonsToPreferMask1: string[];
  reasonsToPreferMask2: string[];
  similarities: string[];
  importantUncertainties: string[];
}

export interface ComparisonSummaryResponse {
  source: 'cache' | 'generated';
  summary: ComparisonSummary;
}

export interface ComparisonSummaryRequest {
  mask1: string;
  mask2: string;
  comparisonRevision: string;
}

export interface PartFinding extends MetricFinding {}

export interface ContextFinding extends MetricFinding {
  classification: string;
}

export interface BodySiteFinding extends MetricFinding {
  complaintReviews: number;
  complaintSeverity: number;
}

export interface MaskProfile {
  slug: string;
  name: string;
  search: { maskTypes: string[] };
  coverage: { processedReviews: number };
  dimensions: MetricFinding[];
  contexts: ContextFinding[];
  bodySites: BodySiteFinding[];
  parts: PartFinding[];
}

export interface RetailerPriceOffer {
  retailer: string;
  productName?: string;
  variantName?: string;
  price: string;
  priceCents: number;
  inStock: boolean;
  observedAt: string;
  configurationNote?: string;
  configuration: {
    headgearIncluded: boolean | null;
    offerType: string;
    size?: string | null;
    frameSize?: string | null;
    headgearSize?: string | null;
    fitPack?: boolean;
    options?: Array<{ name: string; value: string }>;
  };
}

export interface MaskPrices {
  offers: RetailerPriceOffer[];
}

export const DEFAULT_COMPARISON_CRITERIA = [
  'fit-and-sizing',
  'comfort',
  'seal-and-leaks',
  'sleep-compatibility',
  'ease-of-use',
  'airflow-and-noise'
] as const;

export const COMPARISON_RULES_VERSION = 'comparison-rules-v1';

export type ComparisonSide = 'left' | 'right';
export type ComparisonState = 'higher' | 'lower' | 'similar' | 'neutral' | 'unavailable';
export type ContextGroup = 'Better reported for' | 'Mixed results' | 'Extra caution';

export interface ComparisonMaskHeader {
  slug: string;
  name: string;
  imageUrl: string;
  maskType: string;
  processedReviews: number;
}

export interface MaskWarning {
  side: ComparisonSide;
  label: 'Limited evidence';
  message: string;
}

export interface ComparisonFindingSide {
  finding: MetricFinding | null;
  state: ComparisonState;
  labels: string[];
}

export interface AlignedComparisonFinding {
  id: string;
  label: string;
  left: ComparisonFindingSide;
  right: ComparisonFindingSide;
}

export interface ComparisonContextSide {
  finding: ContextFinding;
  group: ContextGroup;
  reason: string;
}

export interface AlignedComparisonContext {
  id: string;
  label: string;
  left: ComparisonContextSide | null;
  right: ComparisonContextSide | null;
}

export interface ComparisonBodySide {
  finding: BodySiteFinding;
  positiveProportion: number;
  complaintProportion: number;
  complaintSeverity: number;
  relevantReviews: number;
  state: ComparisonState;
  labels: string[];
}

export interface AlignedBodyArea {
  id: string;
  label: string;
  left: ComparisonBodySide | null;
  right: ComparisonBodySide | null;
}

export type NotableComponentCategory =
  | 'Consistently praised'
  | 'Consistently criticized'
  | 'Divisive'
  | 'Most discussed';

export interface NotableComponent {
  category: NotableComponentCategory;
  finding: PartFinding;
}

export interface ComparisonPriceSide {
  offer: RetailerPriceOffer | null;
  message: string | null;
}

export interface MaskComparisonModel {
  masks: { left: ComparisonMaskHeader; right: ComparisonMaskHeader };
  eligibility: { eligible: boolean; errors: Array<{ side: ComparisonSide; message: string }> };
  maskWarnings: MaskWarning[];
  differentMaskTypes: boolean;
  criteria: AlignedComparisonFinding[];
  meaningfulDifferences: AlignedComparisonFinding[];
  similarities: AlignedComparisonFinding[];
  contexts: AlignedComparisonContext[];
  bodyAreas: AlignedBodyArea[];
  components: { left: NotableComponent[]; right: NotableComponent[] };
  pricing: {
    includeHeadgear: boolean;
    left: ComparisonPriceSide;
    right: ComparisonPriceSide;
  };
}

export interface ComparisonConfiguration {
  includeHeadgear?: boolean;
}

export function buildMaskComparison(
  leftProfile: MaskProfile,
  leftPrices: MaskPrices | null,
  rightProfile: MaskProfile,
  rightPrices: MaskPrices | null,
  configuration: ComparisonConfiguration = {}
): MaskComparisonModel {
  const includeHeadgear = configuration.includeHeadgear ?? true;
  const criteria = alignFindings(leftProfile.dimensions, rightProfile.dimensions);
  const errors = [
    ...eligibilityErrors(leftProfile, 'left'),
    ...eligibilityErrors(rightProfile, 'right')
  ];

  return {
    masks: {
      left: maskHeader(leftProfile),
      right: maskHeader(rightProfile)
    },
    eligibility: { eligible: errors.length === 0, errors },
    maskWarnings: [
      ...evidenceWarnings(leftProfile, 'left'),
      ...evidenceWarnings(rightProfile, 'right')
    ],
    differentMaskTypes: normalizedMaskType(leftProfile) !== normalizedMaskType(rightProfile),
    criteria,
    meaningfulDifferences: criteria.filter(
      (row) => row.left.state === 'higher' || row.right.state === 'higher'
    ),
    similarities: criteria.filter((row) => row.left.state === 'similar'),
    contexts: alignContexts(leftProfile.contexts, rightProfile.contexts),
    bodyAreas: alignBodyAreas(leftProfile.bodySites, rightProfile.bodySites),
    components: {
      left: notableComponents(leftProfile.parts),
      right: notableComponents(rightProfile.parts)
    },
    pricing: {
      includeHeadgear,
      left: comparisonPrice(leftPrices, includeHeadgear),
      right: comparisonPrice(rightPrices, includeHeadgear)
    }
  };
}

function maskHeader(profile: MaskProfile): ComparisonMaskHeader {
  return {
    slug: profile.slug,
    name: profile.name,
    imageUrl: `/images/masks/${profile.slug}.webp`,
    maskType: normalizedMaskType(profile),
    processedReviews: profile.coverage.processedReviews
  };
}

function eligibilityErrors(
  profile: MaskProfile,
  side: ComparisonSide
): Array<{ side: ComparisonSide; message: string }> {
  return profile.coverage.processedReviews < MIN_COMPARISON_REVIEWS
    ? [
        {
          side,
          message: `${profile.name} does not have enough evidence to compare. At least 50 processed reviews are required.`
        }
      ]
    : [];
}

function evidenceWarnings(profile: MaskProfile, side: ComparisonSide): MaskWarning[] {
  const count = profile.coverage.processedReviews;
  return count >= MIN_COMPARISON_REVIEWS && count < LIMITED_COMPARISON_REVIEWS
    ? [
        {
          side,
          label: 'Limited evidence',
          message: `${profile.name} is based on ${count} processed reviews. Treat comparisons cautiously.`
        }
      ]
    : [];
}

function normalizedMaskType(profile: MaskProfile): string {
  const types = profile.search.maskTypes.map((type) => type.trim().toLowerCase());
  if (types.includes('full face')) return 'Full Face';
  if (types.includes('nasal pillow')) return 'Nasal Pillow';
  if (types.includes('hybrid')) return 'Hybrid';
  if (types.includes('nasal')) return 'Nasal';
  return profile.search.maskTypes[0]?.trim() || 'Unknown';
}

function alignFindings(
  leftFindings: MetricFinding[],
  rightFindings: MetricFinding[]
): AlignedComparisonFinding[] {
  return alignById(leftFindings, rightFindings).map(({ id, left: leftFinding, right: rightFinding }) => {
    const label = leftFinding?.label ?? rightFinding?.label ?? id;
    const [left, right] = classifyFindings(leftFinding, rightFinding);
    return { id, label, left, right };
  });
}

function classifyFindings(
  leftFinding: MetricFinding | null,
  rightFinding: MetricFinding | null
): [ComparisonFindingSide, ComparisonFindingSide] {
  if (!leftFinding || !rightFinding) {
    return [
      { finding: leftFinding, state: 'unavailable', labels: ['Unavailable'] },
      { finding: rightFinding, state: 'unavailable', labels: ['Unavailable'] }
    ];
  }

  if (
    leftFinding.reviewCount < MIN_COMPARISON_FINDING_REVIEWS ||
    rightFinding.reviewCount < MIN_COMPARISON_FINDING_REVIEWS
  ) {
    return [
      {
        finding: leftFinding,
        state: 'neutral',
        labels: [
          leftFinding.reviewCount < MIN_COMPARISON_FINDING_REVIEWS
            ? 'Limited evidence'
            : 'Neutral'
        ]
      },
      {
        finding: rightFinding,
        state: 'neutral',
        labels: [
          rightFinding.reviewCount < MIN_COMPARISON_FINDING_REVIEWS
            ? 'Limited evidence'
            : 'Neutral'
        ]
      }
    ];
  }

  const difference = leftFinding.score - rightFinding.score;
  if (Math.abs(difference) < MEANINGFUL_COMPARISON_DIFFERENCE) {
    return [
      { finding: leftFinding, state: 'similar', labels: ['Similar'] },
      { finding: rightFinding, state: 'similar', labels: ['Similar'] }
    ];
  }

  return difference > 0
    ? [
        { finding: leftFinding, state: 'higher', labels: ['Higher rated'] },
        { finding: rightFinding, state: 'lower', labels: ['Lower rated'] }
      ]
    : [
        { finding: leftFinding, state: 'lower', labels: ['Lower rated'] },
        { finding: rightFinding, state: 'higher', labels: ['Higher rated'] }
      ];
}

function alignContexts(
  leftContexts: ContextFinding[],
  rightContexts: ContextFinding[]
): AlignedComparisonContext[] {
  return alignById(leftContexts, rightContexts).map(({ id, left: leftFinding, right: rightFinding }) => {
    return {
      id,
      label: leftFinding?.label ?? rightFinding?.label ?? id,
      left: leftFinding
        ? { finding: leftFinding, group: contextGroup(leftFinding), reason: contextReason(leftFinding) }
        : null,
      right: rightFinding
        ? {
            finding: rightFinding,
            group: contextGroup(rightFinding),
            reason: contextReason(rightFinding)
          }
        : null
    };
  });
}

function contextGroup(context: ContextFinding): ContextGroup {
  if (context.classification === 'favorable') return 'Better reported for';
  if (context.classification === 'unfavorable') return 'Extra caution';
  return 'Mixed results';
}

function contextReason(context: ContextFinding): string {
  const evidence =
    context.classification === 'unfavorable'
      ? context.negativeEvidence[0]
      : context.positiveEvidence[0] ?? context.negativeEvidence[0];
  if (evidence) return evidence.text;
  if (context.classification === 'favorable') return 'Reports leaned favorable in this context.';
  if (context.classification === 'unfavorable') return 'Reports leaned unfavorable in this context.';
  return 'Reports were mixed in this context.';
}

function alignBodyAreas(
  leftAreas: BodySiteFinding[],
  rightAreas: BodySiteFinding[]
): AlignedBodyArea[] {
  return alignById(leftAreas, rightAreas).map(({ id, left: leftFinding, right: rightFinding }) => {
    const left = leftFinding ? bodySide(leftFinding) : null;
    const right = rightFinding ? bodySide(rightFinding) : null;
    classifyBodySides(left, right);
    return {
      id,
      label: leftFinding?.label ?? rightFinding?.label ?? id,
      left,
      right
    };
  });
}

function bodySide(finding: BodySiteFinding): ComparisonBodySide {
  const relevantReviews = finding.positiveReviews + finding.complaintReviews;
  return {
    finding,
    positiveProportion: relevantReviews ? finding.positiveReviews / relevantReviews : 0,
    complaintProportion: relevantReviews ? finding.complaintReviews / relevantReviews : 0,
    complaintSeverity: finding.complaintSeverity,
    relevantReviews,
    state: 'neutral',
    labels: []
  };
}

function classifyBodySides(
  left: ComparisonBodySide | null,
  right: ComparisonBodySide | null
): void {
  if (!left || !right) {
    if (left) {
      left.state = 'unavailable';
      left.labels = ['Unavailable'];
    }
    if (right) {
      right.state = 'unavailable';
      right.labels = ['Unavailable'];
    }
    return;
  }
  if (
    left.relevantReviews < MIN_COMPARISON_FINDING_REVIEWS ||
    right.relevantReviews < MIN_COMPARISON_FINDING_REVIEWS
  ) {
    left.labels = [
      left.relevantReviews < MIN_COMPARISON_FINDING_REVIEWS ? 'Limited evidence' : 'Neutral'
    ];
    right.labels = [
      right.relevantReviews < MIN_COMPARISON_FINDING_REVIEWS ? 'Limited evidence' : 'Neutral'
    ];
    return;
  }
  const difference = left.positiveProportion - right.positiveProportion;
  if (Math.abs(difference) < MEANINGFUL_COMPARISON_DIFFERENCE / 100) {
    left.state = 'similar';
    right.state = 'similar';
    left.labels = ['Similar'];
    right.labels = ['Similar'];
    return;
  }
  left.state = difference > 0 ? 'higher' : 'lower';
  right.state = difference > 0 ? 'lower' : 'higher';
  left.labels = [difference > 0 ? 'Higher comfort proportion' : 'Higher complaint proportion'];
  right.labels = [difference > 0 ? 'Higher complaint proportion' : 'Higher comfort proportion'];
}

function notableComponents(parts: PartFinding[]): NotableComponent[] {
  const qualified = parts.filter(
    (part) =>
      part.reviewCount >= MIN_COMPARISON_FINDING_REVIEWS && part.evidenceStrength !== 'limited'
  );
  const candidates: NotableComponent[] = [];
  addTopComponent(candidates, qualified, 'Consistently praised', (part) =>
    (part.positiveShare ?? proportion(part.positiveReviews, part.reviewCount)) >= 0.7
  );
  addTopComponent(candidates, qualified, 'Consistently criticized', (part) =>
    (part.negativeShare ?? proportion(part.negativeReviews, part.reviewCount)) >= 0.5
  );
  addTopComponent(candidates, qualified, 'Divisive', (part) => {
    const positive = part.positiveShare ?? proportion(part.positiveReviews, part.reviewCount);
    const negative = part.negativeShare ?? proportion(part.negativeReviews, part.reviewCount);
    return positive >= 0.3 && negative >= 0.3;
  });
  addTopComponent(candidates, qualified, 'Most discussed', () => true);
  return candidates;
}

function addTopComponent(
  results: NotableComponent[],
  parts: PartFinding[],
  category: NotableComponentCategory,
  qualifies: (part: PartFinding) => boolean
): void {
  const finding = parts
    .filter(qualifies)
    .sort(
      (left, right) =>
        right.reviewShare - left.reviewShare ||
        right.reviewCount - left.reviewCount ||
        left.label.localeCompare(right.label)
    )[0];
  if (finding) results.push({ category, finding });
}

function comparisonPrice(
  prices: MaskPrices | null,
  includeHeadgear: boolean
): ComparisonPriceSide {
  const offer = [...(prices?.offers ?? [])]
    .filter(
      (candidate) =>
        candidate.inStock && candidate.configuration.headgearIncluded === includeHeadgear
    )
    .sort(
      (left, right) =>
        left.priceCents - right.priceCents || left.retailer.localeCompare(right.retailer)
    )[0];
  return offer
    ? { offer, message: null }
    : {
        offer: null,
        message: includeHeadgear
          ? 'There are no offers with headgear'
          : 'There are no offers without headgear'
      };
}

function alignById<T extends { id: string }>(
  left: T[],
  right: T[]
): Array<{ id: string; left: T | null; right: T | null }> {
  const leftById = new Map(left.map((item) => [item.id, item]));
  const rightById = new Map(right.map((item) => [item.id, item]));
  return [...new Set([...leftById.keys(), ...rightById.keys()])].map((id) => ({
    id,
    left: leftById.get(id) ?? null,
    right: rightById.get(id) ?? null
  }));
}

export function describePriceConfiguration(offer: RetailerPriceOffer): string {
  const configuration = offer.configuration;
  const details = [
    offer.variantName,
    configuration.size ? `Size ${configuration.size}` : null,
    configuration.frameSize ? `Frame ${configuration.frameSize}` : null,
    configuration.headgearSize ? `Headgear ${configuration.headgearSize}` : null,
    configuration.fitPack ? 'Fit pack' : null,
    ...(configuration.options ?? []).map((option) => `${option.name}: ${option.value}`)
  ].filter((detail): detail is string => Boolean(detail));
  return details.join(' · ') ||
    (configuration.offerType === 'complete' ? 'Complete mask with headgear' : 'Mask without headgear');
}

function proportion(value: number, total: number): number {
  return total ? value / total : 0;
}
