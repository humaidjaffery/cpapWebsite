export type RetailerEvidenceStrength = 'limited' | 'moderate' | 'strong';

export interface RetailerEvidenceExcerpt {
  text: string;
  maskName: string | null;
  productUrl: string | null;
  reviewDate: string | null;
}

export interface RetailerServiceAspect {
  aspect: string;
  label: string;
  reviewCount: number;
  decisiveReviewCount: number;
  positiveShare: number | null;
  grade: string | null;
  positiveReviews: number;
  mixedReviews: number;
  negativeReviews: number;
  evidenceStrength: RetailerEvidenceStrength;
  positiveEvidence: RetailerEvidenceExcerpt[];
  negativeEvidence: RetailerEvidenceExcerpt[];
}

export interface RetailerPolicyFact {
  label: string;
  value: string;
}

export interface RetailerPolicySource {
  title: string;
  url: string;
}

export interface RetailerPolicySection {
  key: string;
  title: string;
  summary: string;
  facts: RetailerPolicyFact[];
  sources: RetailerPolicySource[];
}

export interface RetailerReviewEvidence {
  scrapedReviewCount: number;
  eligibleReviewCount: number;
  processedReviewCount: number;
  averageRating: number | null;
  ratingCount: number;
  maskCount: number;
  reviewDateStart: string | null;
  reviewDateEnd: string | null;
  serviceScopedReviewCount: number;
  serviceClaimReviewCount: number;
  serviceGrade: string | null;
  evidenceStrength: RetailerEvidenceStrength;
}

export interface RetailerProfile {
  slug: string;
  name: string;
  websiteUrl: string;
  reviewEvidence: RetailerReviewEvidence;
  serviceAspects: RetailerServiceAspect[];
  policies: RetailerPolicySection[];
}

export interface RetailerMethodology {
  reviews: string;
  serviceClaims: string;
  serviceScore: string;
  policies: string;
}

export interface RetailerIndex {
  schemaVersion: number;
  generatedAt: string;
  verifiedOn: string;
  profiles: RetailerProfile[];
  methodology: RetailerMethodology;
}
