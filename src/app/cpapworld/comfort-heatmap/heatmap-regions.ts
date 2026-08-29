import { BodySiteFinding, EvidenceExcerpt, EvidenceStrength, RelatedFinding } from '../mask-data';

export type HeatmapRegionId =
  | 'back-of-head'
  | 'ears'
  | 'forehead'
  | 'eyes'
  | 'face-cheeks'
  | 'nose-bridge'
  | 'nose'
  | 'nostrils'
  | 'mouth'
  | 'chin'
  | 'neck';

export type HeatmapTone = 'comfort' | 'discomfort' | 'mixed';

export interface HeatmapRegion {
  id: HeatmapRegionId;
  label: string;
  side: 'left' | 'right';
  widgetTop: number;
  bodySites: BodySiteFinding[];
  positiveReviews: number;
  complaintReviews: number;
  evidenceCount: number;
  tone: HeatmapTone;
  evidenceStrength: EvidenceStrength;
  associatedParts: RelatedFinding[];
  complaintAspects: RelatedFinding[];
  positiveEvidence: EvidenceExcerpt[];
  negativeEvidence: EvidenceExcerpt[];
}

export interface RegionDefinition {
  id: HeatmapRegionId;
  label: string;
  bodySiteIds: readonly string[];
  side: 'left' | 'right';
  widgetTop: number;
  paths: readonly string[];
  featureLines?: readonly string[];
}

export const HEATMAP_REGION_DEFINITIONS: readonly RegionDefinition[] = [
  {
    id: 'back-of-head',
    label: 'Head & headgear',
    bodySiteIds: ['head', 'back_of_head', 'hair', 'scalp'],
    side: 'left',
    widgetTop: 8,
    paths: [
      'M147 251 C137 151 180 72 280 68 C380 72 423 151 413 251 C398 176 355 128 280 128 C205 128 162 176 147 251 Z'
    ]
  },
  {
    id: 'forehead',
    label: 'Forehead',
    bodySiteIds: ['forehead'],
    side: 'right',
    widgetTop: 8,
    paths: ['M179 159 C207 121 353 121 381 159 L361 235 C322 216 238 216 199 235 Z']
  },
  {
    id: 'ears',
    label: 'Ears',
    bodySiteIds: ['ears'],
    side: 'left',
    widgetTop: 24,
    paths: [
      'M100 300 a31 67 0 1 0 62 0 a31 67 0 1 0 -62 0',
      'M398 300 a31 67 0 1 0 62 0 a31 67 0 1 0 -62 0'
    ]
  },
  {
    id: 'eyes',
    label: 'Around the eyes',
    bodySiteIds: ['eyes'],
    side: 'right',
    widgetTop: 24,
    paths: [
      'M166 269 a53 29 0 1 0 106 0 a53 29 0 1 0 -106 0',
      'M288 269 a53 29 0 1 0 106 0 a53 29 0 1 0 -106 0'
    ],
    featureLines: ['M190 268 Q219 250 248 268', 'M312 268 Q341 250 370 268']
  },
  {
    id: 'nose-bridge',
    label: 'Nose bridge',
    bodySiteIds: ['nose_bridge', 'higher_on_nose'],
    side: 'left',
    widgetTop: 40,
    paths: ['M255 233 Q280 218 305 233 L314 356 Q280 372 246 356 Z']
  },
  {
    id: 'face-cheeks',
    label: 'Face & cheeks',
    bodySiteIds: ['face', 'cheeks', 'skin'],
    side: 'right',
    widgetTop: 40,
    paths: [
      'M151 302 C176 274 222 278 238 331 C233 404 190 435 163 399 C150 371 146 335 151 302 Z',
      'M409 302 C384 274 338 278 322 331 C327 404 370 435 397 399 C410 371 414 335 409 302 Z'
    ]
  },
  {
    id: 'nose',
    label: 'Nose',
    bodySiteIds: ['nose'],
    side: 'left',
    widgetTop: 56,
    paths: ['M246 333 Q280 309 314 333 L328 382 Q280 410 232 382 Z']
  },
  {
    id: 'nostrils',
    label: 'Nostrils',
    bodySiteIds: ['nostrils', 'nares', 'nasal_passages', 'sinuses', 'under_nose'],
    side: 'right',
    widgetTop: 56,
    paths: [
      'M242 377 a19 13 0 1 0 38 0 a19 13 0 1 0 -38 0',
      'M280 377 a19 13 0 1 0 38 0 a19 13 0 1 0 -38 0'
    ]
  },
  {
    id: 'mouth',
    label: 'Mouth & lips',
    bodySiteIds: ['mouth', 'lips', 'upper_lip', 'lower_lip', 'teeth'],
    side: 'left',
    widgetTop: 72,
    paths: ['M220 431 Q280 397 340 431 Q313 482 280 485 Q247 482 220 431 Z'],
    featureLines: ['M240 441 Q280 458 320 441']
  },
  {
    id: 'chin',
    label: 'Chin',
    bodySiteIds: ['chin'],
    side: 'right',
    widgetTop: 72,
    paths: ['M222 485 Q280 507 338 485 Q326 540 280 548 Q234 540 222 485 Z']
  },
  {
    id: 'neck',
    label: 'Neck & throat',
    bodySiteIds: ['neck', 'throat'],
    side: 'left',
    widgetTop: 88,
    paths: [
      'M214 515 C221 576 202 616 184 660 H376 C358 616 339 576 346 515 C313 548 247 548 214 515 Z'
    ]
  }
];

const EVIDENCE_STRENGTH_RANK: Record<EvidenceStrength, number> = {
  limited: 1,
  moderate: 2,
  strong: 3
};
const MINIMUM_REGION_EVIDENCE = 5;

export function buildHeatmapRegions(bodySites: readonly BodySiteFinding[]): HeatmapRegion[] {
  const bodySitesById = new Map(bodySites.map((site) => [site.id, site]));

  return HEATMAP_REGION_DEFINITIONS.flatMap((definition) => {
    const matchedSites = definition.bodySiteIds.flatMap((id) => {
      const site = bodySitesById.get(id);
      return site ? [site] : [];
    });
    if (!matchedSites.length) return [];

    const positiveReviews = sum(matchedSites, (site) => site.positiveReviews);
    const complaintReviews = sum(matchedSites, (site) => site.complaintReviews);
    const evidenceCount = positiveReviews + complaintReviews;
    if (evidenceCount < MINIMUM_REGION_EVIDENCE) return [];

    return [
      {
        ...definition,
        bodySites: matchedSites,
        positiveReviews,
        complaintReviews,
        evidenceCount,
        tone: heatmapTone(positiveReviews, complaintReviews),
        evidenceStrength: strongestEvidence(matchedSites),
        associatedParts: mergeRelatedFindings(
          matchedSites.flatMap((site) => site.associatedParts ?? site.involvedParts)
        ),
        complaintAspects: mergeRelatedFindings(
          matchedSites.flatMap((site) => site.complaintAspects)
        ),
        positiveEvidence: uniqueEvidence(matchedSites.flatMap((site) => site.positiveEvidence)),
        negativeEvidence: uniqueEvidence(matchedSites.flatMap((site) => site.negativeEvidence))
      }
    ];
  });
}

function heatmapTone(positiveReviews: number, complaintReviews: number): HeatmapTone {
  if (positiveReviews >= 5 && complaintReviews >= 5) return 'mixed';
  return positiveReviews >= complaintReviews ? 'comfort' : 'discomfort';
}

function strongestEvidence(sites: readonly BodySiteFinding[]): EvidenceStrength {
  return sites.reduce(
    (strongest, site) =>
      EVIDENCE_STRENGTH_RANK[site.evidenceStrength] > EVIDENCE_STRENGTH_RANK[strongest]
        ? site.evidenceStrength
        : strongest,
    'limited' as EvidenceStrength
  );
}

function mergeRelatedFindings(findings: readonly RelatedFinding[]): RelatedFinding[] {
  const merged = new Map<string, RelatedFinding>();
  for (const finding of findings) {
    const existing = merged.get(finding.id);
    merged.set(finding.id, {
      ...finding,
      reviewCount: finding.reviewCount + (existing?.reviewCount ?? 0)
    });
  }
  return [...merged.values()].sort((left, right) => right.reviewCount - left.reviewCount);
}

function uniqueEvidence(evidence: readonly EvidenceExcerpt[]): EvidenceExcerpt[] {
  const seen = new Set<string>();
  return evidence.filter((excerpt) => {
    const key = `${excerpt.retailer}|${excerpt.productUrl}|${excerpt.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sum<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}
