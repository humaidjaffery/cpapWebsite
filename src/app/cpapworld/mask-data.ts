export type CoverageStatus = 'complete' | 'preliminary' | 'pending' | 'unavailable';
export type EvidenceStrength = 'limited' | 'moderate' | 'strong';
export type ContextClassification = 'favorable' | 'unfavorable' | 'mixed';
export type InteractionKind = 'patient-context' | 'body-component';
export type InteractionTone = 'favorable' | 'caution' | 'mixed';

export interface Coverage {
  status: CoverageStatus;
  processedReviews: number;
  eligibleReviews: number;
  processedShare: number;
  retailerCount: number;
  reviewDateStart: string | null;
  reviewDateEnd: string | null;
}

export interface ScoreComponent {
  score: number | null;
  reviewCount: number;
  weight: number;
  average?: number | null;
  averageSentiment?: number | null;
}

export interface OverallResult {
  compositeScore: number | null;
  ratingComponent: ScoreComponent;
  textSatisfactionComponent: ScoreComponent;
}

export interface EvidenceExcerpt {
  text: string;
  retailer: string;
  productUrl: string;
}

export interface RelatedFinding {
  id: string;
  label: string;
  reviewCount: number;
}

export interface MetricFinding {
  id: string;
  label: string;
  score: number;
  averageSentiment: number;
  reviewCount: number;
  reviewShare: number;
  positiveReviews: number;
  mixedReviews: number;
  negativeReviews: number;
  positiveShare?: number;
  negativeShare?: number;
  evidenceStrength: EvidenceStrength;
  associatedParts?: RelatedFinding[];
  associatedContexts?: RelatedFinding[];
  associatedBodySites?: RelatedFinding[];
  positiveEvidence: EvidenceExcerpt[];
  negativeEvidence: EvidenceExcerpt[];
}

export interface PartFinding extends MetricFinding {
  praisedAspects: MetricFinding[];
  criticizedAspects: MetricFinding[];
}

export interface PartAspectFinding extends MetricFinding {
  partId: string;
  partLabel: string;
  aspectId: string;
  aspectLabel: string;
}

export interface ContextFinding extends MetricFinding {
  sourceContexts: string[];
  classification: ContextClassification;
  limitedEvidence: boolean;
}

export interface ContextAspectFinding extends MetricFinding {
  contextId: string;
  contextLabel: string;
  aspectId: string;
  aspectLabel: string;
}

export interface BodySiteFinding extends MetricFinding {
  complaintReviews: number;
  complaintShare: number;
  complaintSeverity: number;
  complaintAspects: RelatedFinding[];
  involvedParts: RelatedFinding[];
}

export interface InteractionInsight extends MetricFinding {
  kind: InteractionKind;
  tone: InteractionTone;
  description: string;
  contextId: string | null;
  contextLabel: string | null;
  aspectId: string;
  aspectLabel: string;
  parts: RelatedFinding[];
  bodySites: RelatedFinding[];
  contexts: RelatedFinding[];
}

export interface RetailerFinding {
  retailer: string;
  reviewCount: number;
  averageRating: number | null;
  ratingCount: number;
  evidenceStrength: EvidenceStrength;
  productUrl: string;
}

export interface Methodology {
  overallScore: string;
  aggregation: string;
  sentiment: string;
  minimumEvidence: string;
  limitations: string;
}

export interface MaskProfile {
  schemaVersion: number;
  slug: string;
  name: string;
  catalogOrder: number;
  coverage: Coverage;
  overall: OverallResult;
  dimensions: MetricFinding[];
  aspects: MetricFinding[];
  parts: PartFinding[];
  partAspectMatrix: PartAspectFinding[];
  contexts: ContextFinding[];
  contextAspectMatrix: ContextAspectFinding[];
  bestFor: string[];
  mayNotSuit: string[];
  bodySites: BodySiteFinding[];
  interactionSummary: string[];
  interactionInsights: InteractionInsight[];
  strengths: MetricFinding[];
  concerns: MetricFinding[];
  retailers: RetailerFinding[];
  evidence: {
    positive: EvidenceExcerpt[];
    negative: EvidenceExcerpt[];
  };
  methodology: Methodology;
}

export interface RetailerPriceOffer {
  retailer: string;
  productName: string;
  productUrl: string;
  variantName: string;
  priceCents: number;
  price: string;
  compareAtPriceCents?: number;
  compareAtPrice?: string;
  currency: string;
  inStock: boolean;
  observedAt: string;
  configurationNote: string;
}

export interface PriceHistoryPoint {
  date: string;
  retailer: string;
  priceCents: number;
  price: string;
}

export interface MaskPrices {
  schemaVersion: number;
  mask: string;
  slug: string;
  generatedAt: string;
  status: 'available' | 'unavailable';
  cheapestOffer: RetailerPriceOffer | null;
  offers: RetailerPriceOffer[];
  priceHistory: PriceHistoryPoint[];
  methodology: string;
}

export interface MaskIndexItem {
  name: string;
  slug: string;
  catalogOrder: number;
  coverage: Coverage;
  overall: OverallResult;
  topStrengths: RelatedFinding[];
  topConcerns: RelatedFinding[];
}

export interface MaskIndex {
  schemaVersion: number;
  masks: MaskIndexItem[];
  source: {
    eligibleReviews: number;
    processedReviews: number;
    completedParts: number[];
    correctionsApplied: number;
  };
}
