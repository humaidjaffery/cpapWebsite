import { createHash } from "node:crypto";

import {
  AlignedComparisonFinding,
  buildMaskComparison,
  COMPARISON_RULES_VERSION,
  ContextFinding,
  ComparisonBodySide,
  ComparisonMaskHeader,
  LIMITED_COMPARISON_REVIEWS,
  MaskProfile,
  MEANINGFUL_COMPARISON_DIFFERENCE,
  MIN_COMPARISON_FINDING_REVIEWS,
  MIN_COMPARISON_REVIEWS,
  MetricFinding,
  PartFinding,
  RetailerPriceOffer,
} from "./comparison-model";

export { COMPARISON_RULES_VERSION } from "./comparison-model";
export const COMPARISON_PROMPT_VERSION = "comparison-summary-v2";

export interface SourceFinding {
  id: string;
  label: string;
  score: number;
  grade: string;
  reviewCount: number;
  evidenceStrength: string;
  positiveReviews?: number;
  negativeReviews?: number;
  complaintReviews?: number;
  positiveShare?: number;
  negativeShare?: number;
  reviewShare?: number;
  classification?: string;
  limitedEvidence?: boolean;
  complaintSeverity?: number;
}

export interface SourceOffer {
  retailer: string;
  price: string;
  priceCents: number;
  inStock: boolean;
  observedAt: string;
  configuration: { headgearIncluded: boolean | null; offerType: string };
}

export interface MaskSourceRecord {
  revision: string;
  profile: {
    slug: string;
    name: string;
    search: { maskTypes: string[] };
    coverage: { processedReviews: number };
    dimensions: SourceFinding[];
    contexts: SourceFinding[];
    bodySites: SourceFinding[];
    parts: SourceFinding[];
    evidence?: unknown;
  };
  prices: {
    generatedAt: string;
    offers: SourceOffer[];
  } | null;
}

export interface ComparisonSummary {
  decisionTakeaway: string;
  reasonsToPreferMask1: string[];
  reasonsToPreferMask2: string[];
  similarities: string[];
  importantUncertainties: string[];
}

export interface CuratedComparisonInput {
  masks: Array<{
    slug: string;
    name: string;
    maskType: string;
    processedReviews: number;
    limitedEvidence: boolean;
  }>;
  differentMaskTypes: boolean;
  meaningfulDifferences: Array<{
    id: string;
    label: string;
    mask1: { score: number; grade: string; reviewCount: number; evidenceStrength: string };
    mask2: { score: number; grade: string; reviewCount: number; evidenceStrength: string };
  }>;
  similarities: CuratedComparisonInput["meaningfulDifferences"];
  userFit: Array<{
    id: string;
    label: string;
    mask1: CuratedFinding | null;
    mask2: CuratedFinding | null;
  }>;
  bodyAreas: Array<{
    id: string;
    label: string;
    mask1: CuratedFinding | null;
    mask2: CuratedFinding | null;
  }>;
  notableComponents: { mask1: CuratedFinding[]; mask2: CuratedFinding[] };
  pricesWithHeadgear: { mask1: CuratedPrice | null; mask2: CuratedPrice | null };
  rules: {
    minimumFindingReviews: number;
    meaningfulScoreDifference: number;
  };
}

interface CuratedFinding {
  id: string;
  label: string;
  score: number;
  grade: string;
  reviewCount: number;
  evidenceStrength: string;
  classification?: string;
  positiveShare?: number;
  negativeShare?: number;
  reviewShare?: number;
  complaintSeverity?: number;
  category?: string;
}

interface CuratedPrice {
  retailer: string;
  price: string;
  observedAt: string;
}

export interface ComparisonCacheRecord {
  canonicalMaskOrder: [string, string];
  dataRevisions: [string, string];
  inputFingerprints: [string, string];
  promptVersion: string;
  rulesVersion: string;
  summary: ComparisonSummary;
  createdAt: string;
  updatedAt: string;
  openaiResponseId?: string;
}

export interface ComparisonDependencies {
  data: { getMask(slug: string): Promise<MaskSourceRecord> };
  cache: {
    get(key: string): Promise<ComparisonCacheRecord | null>;
    set(key: string, record: ComparisonCacheRecord): Promise<void>;
  };
  openai: {
    generate(
      input: CuratedComparisonInput,
    ): Promise<{ summary: ComparisonSummary; responseId: string }>;
  };
  now?: () => string;
}

export async function getComparisonSummary(
  request: { mask1: string; mask2: string; comparisonRevision: string },
  dependencies: ComparisonDependencies,
): Promise<{ source: "cache" | "generated"; summary: ComparisonSummary }> {
  validateRequest(request);
  const canonicalMaskOrder = [request.mask1, request.mask2].sort() as [string, string];
  const cacheKey = canonicalMaskOrder.join("__");
  const [first, second] = await Promise.all(
    canonicalMaskOrder.map((slug) => dependencies.data.getMask(slug)),
  );
  validateSource(first, canonicalMaskOrder[0]);
  validateSource(second, canonicalMaskOrder[1]);
  const records: [MaskSourceRecord, MaskSourceRecord] = [first, second];
  const dataRevisions: [string, string] = [first.revision, second.revision];
  const inputFingerprints: [string, string] = [fingerprint(first), fingerprint(second)];
  const cached = await dependencies.cache.get(cacheKey);

  if (
    cached &&
    samePair(cached.canonicalMaskOrder, canonicalMaskOrder) &&
    samePair(cached.dataRevisions, dataRevisions) &&
    samePair(cached.inputFingerprints, inputFingerprints) &&
    cached.promptVersion === COMPARISON_PROMPT_VERSION &&
    cached.rulesVersion === COMPARISON_RULES_VERSION &&
    validSummary(cached.summary)
  ) {
    return {
      source: "cache",
      summary: requestedOrder(cached.summary, request.mask1, canonicalMaskOrder[0]),
    };
  }

  const input = buildCuratedComparisonInput(records);
  const generated = await dependencies.openai.generate(input);
  if (!validSummary(generated.summary)) {
    throw new Error("OpenAI returned an invalid structured comparison summary");
  }

  const now = (dependencies.now ?? (() => new Date().toISOString()))();
  const record: ComparisonCacheRecord = {
    canonicalMaskOrder,
    dataRevisions,
    inputFingerprints,
    promptVersion: COMPARISON_PROMPT_VERSION,
    rulesVersion: COMPARISON_RULES_VERSION,
    summary: generated.summary,
    createdAt: cached?.createdAt ?? now,
    updatedAt: now,
    ...(generated.responseId ? { openaiResponseId: generated.responseId } : {}),
  };
  await dependencies.cache.set(cacheKey, record);

  return {
    source: "generated",
    summary: requestedOrder(generated.summary, request.mask1, canonicalMaskOrder[0]),
  };
}

export function buildCuratedComparisonInput(
  records: [MaskSourceRecord, MaskSourceRecord],
): CuratedComparisonInput {
  const [first, second] = records;
  const model = buildMaskComparison(
    comparisonProfile(first),
    first.prices,
    comparisonProfile(second),
    second.prices,
  );

  return {
    masks: [curatedMask(model.masks.left), curatedMask(model.masks.right)],
    differentMaskTypes: model.differentMaskTypes,
    meaningfulDifferences: model.meaningfulDifferences.flatMap(curatedAlignedFinding),
    similarities: model.similarities.flatMap(curatedAlignedFinding),
    userFit: model.contexts.map((row) => ({
      id: row.id,
      label: row.label,
      mask1: row.left
        ? { ...coreFinding(row.left.finding), classification: row.left.group }
        : null,
      mask2: row.right
        ? { ...coreFinding(row.right.finding), classification: row.right.group }
        : null,
    })),
    bodyAreas: model.bodyAreas.map((row) => ({
      id: row.id,
      label: row.label,
      mask1: row.left ? curatedBodySide(row.left) : null,
      mask2: row.right ? curatedBodySide(row.right) : null,
    })),
    notableComponents: {
      mask1: model.components.left.map((item) => ({
        ...coreFinding(item.finding),
        category: item.category,
      })),
      mask2: model.components.right.map((item) => ({
        ...coreFinding(item.finding),
        category: item.category,
      })),
    },
    pricesWithHeadgear: {
      mask1: curatedPrice(model.pricing.left.offer),
      mask2: curatedPrice(model.pricing.right.offer),
    },
    rules: {
      minimumFindingReviews: MIN_COMPARISON_FINDING_REVIEWS,
      meaningfulScoreDifference: MEANINGFUL_COMPARISON_DIFFERENCE,
    },
  };
}

function validateRequest(request: {
  mask1: string;
  mask2: string;
  comparisonRevision: string;
}): void {
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (
    !slugPattern.test(request.mask1) ||
    !slugPattern.test(request.mask2) ||
    request.mask1 === request.mask2 ||
    request.comparisonRevision !== COMPARISON_RULES_VERSION
  ) {
    throw new Error("Invalid comparison request");
  }
}

function validateSource(record: MaskSourceRecord, requestedSlug: string): void {
  if (
    record.profile.slug !== requestedSlug ||
    record.profile.coverage.processedReviews < MIN_COMPARISON_REVIEWS
  ) {
    throw new Error("Invalid comparison source data");
  }
}

function comparisonProfile(record: MaskSourceRecord): MaskProfile {
  const finding = (source: SourceFinding): MetricFinding => ({
    id: source.id,
    label: source.label,
    score: source.score,
    grade: source.grade,
    reviewCount: source.reviewCount,
    reviewShare: source.reviewShare ?? 0,
    positiveReviews: source.positiveReviews ?? 0,
    negativeReviews: source.negativeReviews ?? 0,
    evidenceStrength: source.evidenceStrength,
    ...(typeof source.positiveShare === "number"
      ? { positiveShare: source.positiveShare }
      : {}),
    ...(typeof source.negativeShare === "number"
      ? { negativeShare: source.negativeShare }
      : {}),
    positiveEvidence: [],
    negativeEvidence: [],
  });
  return {
    slug: record.profile.slug,
    name: record.profile.name,
    search: record.profile.search,
    coverage: record.profile.coverage,
    dimensions: record.profile.dimensions.map(finding),
    contexts: record.profile.contexts.map(
      (source): ContextFinding => ({
        ...finding(source),
        classification: source.classification ?? "mixed",
      }),
    ),
    bodySites: record.profile.bodySites.map((source) => ({
      ...finding(source),
      complaintReviews: source.complaintReviews ?? source.negativeReviews ?? 0,
      complaintSeverity: source.complaintSeverity ?? 0,
    })),
    parts: record.profile.parts.map((source): PartFinding => finding(source)),
  };
}

function curatedMask(mask: ComparisonMaskHeader): CuratedComparisonInput["masks"][number] {
  return {
    slug: mask.slug,
    name: mask.name,
    maskType: mask.maskType,
    processedReviews: mask.processedReviews,
    limitedEvidence:
      mask.processedReviews >= MIN_COMPARISON_REVIEWS &&
      mask.processedReviews < LIMITED_COMPARISON_REVIEWS,
  };
}

function curatedAlignedFinding(
  row: AlignedComparisonFinding,
): CuratedComparisonInput["meaningfulDifferences"] {
  return row.left.finding && row.right.finding
    ? [
        {
          id: row.id,
          label: row.label,
          mask1: coreFinding(row.left.finding),
          mask2: coreFinding(row.right.finding),
        },
      ]
    : [];
}

function curatedBodySide(side: ComparisonBodySide): CuratedFinding {
  return {
    ...coreFinding(side.finding),
    positiveShare: side.positiveProportion,
    negativeShare: side.complaintProportion,
    complaintSeverity: side.complaintSeverity,
  };
}

function curatedPrice(offer: RetailerPriceOffer | null): CuratedPrice | null {
  return offer
    ? { retailer: offer.retailer, price: offer.price, observedAt: offer.observedAt }
    : null;
}

function coreFinding(finding: SourceFinding): CuratedFinding {
  return {
    id: finding.id,
    label: finding.label,
    score: finding.score,
    grade: finding.grade,
    reviewCount: finding.reviewCount,
    evidenceStrength: finding.evidenceStrength,
    ...(finding.classification ? { classification: finding.classification } : {}),
    ...(typeof finding.positiveShare === "number"
      ? { positiveShare: finding.positiveShare }
      : {}),
    ...(typeof finding.negativeShare === "number"
      ? { negativeShare: finding.negativeShare }
      : {}),
    ...(typeof finding.reviewShare === "number" ? { reviewShare: finding.reviewShare } : {}),
    ...(typeof finding.complaintSeverity === "number"
      ? { complaintSeverity: finding.complaintSeverity }
      : {}),
  };
}

function fingerprint(record: MaskSourceRecord): string {
  const curated = {
    revision: record.revision,
    profile: {
      slug: record.profile.slug,
      name: record.profile.name,
      search: record.profile.search,
      coverage: record.profile.coverage,
      dimensions: record.profile.dimensions.map(coreFinding),
      contexts: record.profile.contexts.map(coreFinding),
      bodySites: record.profile.bodySites.map(coreFinding),
      parts: record.profile.parts.map(coreFinding),
    },
    prices: record.prices
      ? {
          generatedAt: record.prices.generatedAt,
          offers: record.prices.offers.map((offer) => ({
            retailer: offer.retailer,
            priceCents: offer.priceCents,
            inStock: offer.inStock,
            observedAt: offer.observedAt,
            headgearIncluded: offer.configuration.headgearIncluded,
          })),
        }
      : null,
  };
  return createHash("sha256").update(JSON.stringify(curated)).digest("hex");
}

function validSummary(value: ComparisonSummary): boolean {
  return (
    typeof value?.decisionTakeaway === "string" &&
    value.decisionTakeaway.trim().length > 0 &&
    stringArray(value.reasonsToPreferMask1) &&
    stringArray(value.reasonsToPreferMask2) &&
    stringArray(value.similarities) &&
    stringArray(value.importantUncertainties) &&
    !containsPositionalMaskReference([
      value.decisionTakeaway,
      ...value.reasonsToPreferMask1,
      ...value.reasonsToPreferMask2,
      ...value.similarities,
      ...value.importantUncertainties,
    ])
  );
}

function containsPositionalMaskReference(values: string[]): boolean {
  const positionalMask = /\b(?:mask\s*[12]|(?:first|second|left|right)\s+mask|mask\s+on\s+the\s+(?:left|right))\b/i;
  return values.some((value) => positionalMask.test(value));
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim());
}

function requestedOrder(
  summary: ComparisonSummary,
  requestedFirst: string,
  canonicalFirst: string,
): ComparisonSummary {
  return requestedFirst === canonicalFirst
    ? summary
    : {
        ...summary,
        reasonsToPreferMask1: summary.reasonsToPreferMask2,
        reasonsToPreferMask2: summary.reasonsToPreferMask1,
      };
}

function samePair(left: [string, string], right: [string, string]): boolean {
  return left[0] === right[0] && left[1] === right[1];
}
