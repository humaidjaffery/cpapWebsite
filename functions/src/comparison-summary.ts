import { createHash } from "node:crypto";

export const COMPARISON_RULES_VERSION = "comparison-rules-v1";
export const COMPARISON_PROMPT_VERSION = "comparison-summary-v1";

const MIN_MASK_REVIEWS = 50;
const LIMITED_MASK_REVIEWS = 100;
const MIN_FINDING_REVIEWS = 10;
const MEANINGFUL_SCORE_DIFFERENCE = 5;

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
  const masks = records.map((record) => ({
    slug: record.profile.slug,
    name: record.profile.name,
    maskType: maskType(record),
    processedReviews: record.profile.coverage.processedReviews,
    limitedEvidence:
      record.profile.coverage.processedReviews >= MIN_MASK_REVIEWS &&
      record.profile.coverage.processedReviews < LIMITED_MASK_REVIEWS,
  }));
  const alignedDimensions = alignQualified(first.profile.dimensions, second.profile.dimensions);

  return {
    masks,
    differentMaskTypes: masks[0].maskType !== masks[1].maskType,
    meaningfulDifferences: alignedDimensions.filter(
      (row) => Math.abs(row.mask1.score - row.mask2.score) >= MEANINGFUL_SCORE_DIFFERENCE,
    ),
    similarities: alignedDimensions.filter(
      (row) => Math.abs(row.mask1.score - row.mask2.score) < MEANINGFUL_SCORE_DIFFERENCE,
    ),
    userFit: alignOptional(first.profile.contexts, second.profile.contexts),
    bodyAreas: alignOptional(first.profile.bodySites, second.profile.bodySites),
    notableComponents: {
      mask1: qualifiedComponents(first.profile.parts),
      mask2: qualifiedComponents(second.profile.parts),
    },
    pricesWithHeadgear: {
      mask1: lowestPrice(first),
      mask2: lowestPrice(second),
    },
    rules: {
      minimumFindingReviews: MIN_FINDING_REVIEWS,
      meaningfulScoreDifference: MEANINGFUL_SCORE_DIFFERENCE,
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
    record.profile.coverage.processedReviews < MIN_MASK_REVIEWS
  ) {
    throw new Error("Invalid comparison source data");
  }
}

function alignQualified(
  first: SourceFinding[],
  second: SourceFinding[],
): CuratedComparisonInput["meaningfulDifferences"] {
  return first.flatMap((left) => {
    const right = second.find((finding) => finding.id === left.id);
    if (
      !right ||
      left.reviewCount < MIN_FINDING_REVIEWS ||
      right.reviewCount < MIN_FINDING_REVIEWS
    ) {
      return [];
    }
    return [
      {
        id: left.id,
        label: left.label,
        mask1: coreFinding(left),
        mask2: coreFinding(right),
      },
    ];
  });
}

function alignOptional(
  first: SourceFinding[],
  second: SourceFinding[],
): Array<{
  id: string;
  label: string;
  mask1: CuratedFinding | null;
  mask2: CuratedFinding | null;
}> {
  const ids = [...new Set([...first.map((finding) => finding.id), ...second.map((finding) => finding.id)])];
  return ids.map((id) => {
    const left = first.find((finding) => finding.id === id);
    const right = second.find((finding) => finding.id === id);
    return {
      id,
      label: left?.label ?? right?.label ?? id,
      mask1: left ? coreFinding(left) : null,
      mask2: right ? coreFinding(right) : null,
    };
  });
}

function qualifiedComponents(parts: SourceFinding[]): CuratedFinding[] {
  return parts
    .filter(
      (part) => part.reviewCount >= MIN_FINDING_REVIEWS && part.evidenceStrength !== "limited",
    )
    .sort(
      (left, right) =>
        (right.reviewShare ?? 0) - (left.reviewShare ?? 0) || right.reviewCount - left.reviewCount,
    )
    .slice(0, 6)
    .map(coreFinding);
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
  };
}

function lowestPrice(record: MaskSourceRecord): CuratedPrice | null {
  const offer = [...(record.prices?.offers ?? [])]
    .filter((candidate) => candidate.inStock && candidate.configuration.headgearIncluded === true)
    .sort((left, right) => left.priceCents - right.priceCents)[0];
  return offer
    ? { retailer: offer.retailer, price: offer.price, observedAt: offer.observedAt }
    : null;
}

function maskType(record: MaskSourceRecord): string {
  const types = record.profile.search.maskTypes.map((type) => type.toLowerCase());
  if (types.includes("full face")) return "Full Face";
  if (types.includes("nasal pillow")) return "Nasal Pillow";
  if (types.includes("hybrid")) return "Hybrid";
  if (types.includes("nasal")) return "Nasal";
  return record.profile.search.maskTypes[0] ?? "Unknown";
}

function fingerprint(record: MaskSourceRecord): string {
  const curated = {
    revision: record.revision,
    profile: {
      slug: record.profile.slug,
      name: record.profile.name,
      search: record.profile.search,
      coverage: record.profile.coverage,
      dimensions: record.profile.dimensions.map(coreFindingWithId),
      contexts: record.profile.contexts.map(coreFindingWithId),
      bodySites: record.profile.bodySites.map(coreFindingWithId),
      parts: record.profile.parts.map(coreFindingWithId),
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

function coreFindingWithId(finding: SourceFinding): CuratedFinding {
  return coreFinding(finding);
}

function validSummary(value: ComparisonSummary): boolean {
  return (
    typeof value?.decisionTakeaway === "string" &&
    value.decisionTakeaway.trim().length > 0 &&
    stringArray(value.reasonsToPreferMask1) &&
    stringArray(value.reasonsToPreferMask2) &&
    stringArray(value.similarities) &&
    stringArray(value.importantUncertainties)
  );
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
