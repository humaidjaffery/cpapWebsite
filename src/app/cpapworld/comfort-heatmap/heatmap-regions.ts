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
  gradientRadius?: number;
  heatScale?: number;
  activeHeatScale?: number;
}

export const HEATMAP_REGION_DEFINITIONS: readonly RegionDefinition[] = [
  {
    id: 'back-of-head',
    label: 'Head & headgear',
    bodySiteIds: ['head', 'back_of_head', 'hair', 'scalp'],
    side: 'left',
    widgetTop: 8,
    paths: [
      'M350 324 C340 260 346 197 378 144 C420 75 494 58 592 58 C690 58 764 75 806 144 C838 197 844 260 834 324 C782 300 700 284 592 284 C484 284 402 300 350 324 Z'
    ],
    gradientRadius: 66,
    heatScale: 0.9,
    activeHeatScale: 0.94
  },
  {
    id: 'forehead',
    label: 'Forehead',
    bodySiteIds: ['forehead'],
    side: 'right',
    widgetTop: 8,
    paths: ['M389 342 C430 282 754 282 795 342 L766 405 C700 382 484 382 418 405 Z']
  },
  {
    id: 'ears',
    label: 'Ears',
    bodySiteIds: ['ears'],
    side: 'left',
    widgetTop: 24,
    paths: [
      'M326 469 a30 83 0 1 0 60 0 a30 83 0 1 0 -60 0',
      'M798 469 a30 83 0 1 0 60 0 a30 83 0 1 0 -60 0'
    ]
  },
  {
    id: 'eyes',
    label: 'Around the eyes',
    bodySiteIds: ['eyes'],
    side: 'right',
    widgetTop: 24,
    paths: [
      'M421 423 C438 384 535 382 559 422 C538 463 444 466 421 423 Z',
      'M625 422 C649 382 746 384 763 423 C740 466 646 463 625 422 Z'
    ],
    featureLines: ['M448 422 Q490 397 532 422', 'M652 422 Q694 397 736 422']
  },
  {
    id: 'nose-bridge',
    label: 'Nose bridge',
    bodySiteIds: ['nose_bridge', 'higher_on_nose'],
    side: 'left',
    widgetTop: 40,
    paths: ['M548 407 Q592 390 636 407 L647 535 Q592 566 537 535 Z']
  },
  {
    id: 'face-cheeks',
    label: 'Face & cheeks',
    bodySiteIds: ['face', 'cheeks', 'skin'],
    side: 'right',
    widgetTop: 40,
    paths: [
      'M392 466 C425 447 486 451 516 480 C530 500 531 526 520 551 C508 581 489 613 462 632 C430 652 397 634 383 602 C369 568 366 511 378 483 C381 475 386 469 392 466 Z',
      'M792 466 C759 447 698 451 668 480 C654 500 653 526 664 551 C676 581 695 613 722 632 C754 652 787 634 801 602 C815 568 818 511 806 483 C803 475 798 469 792 466 Z'
    ],
    gradientRadius: 64,
    heatScale: 0.88,
    activeHeatScale: 0.92
  },
  {
    id: 'nose',
    label: 'Nose',
    bodySiteIds: ['nose'],
    side: 'left',
    widgetTop: 56,
    paths: ['M540 490 Q592 465 644 490 L657 557 Q592 591 527 557 Z']
  },
  {
    id: 'nostrils',
    label: 'Nostrils',
    bodySiteIds: ['nostrils', 'nares', 'nasal_passages', 'sinuses', 'under_nose'],
    side: 'right',
    widgetTop: 56,
    paths: [
      'M538 556 a23 12 0 1 0 46 0 a23 12 0 1 0 -46 0',
      'M600 556 a23 12 0 1 0 46 0 a23 12 0 1 0 -46 0'
    ]
  },
  {
    id: 'mouth',
    label: 'Mouth & lips',
    bodySiteIds: ['mouth', 'lips', 'upper_lip', 'lower_lip', 'teeth'],
    side: 'left',
    widgetTop: 72,
    paths: ['M500 619 Q592 583 684 619 Q650 668 592 670 Q534 668 500 619 Z'],
    featureLines: ['M530 630 Q592 654 654 630']
  },
  {
    id: 'chin',
    label: 'Chin',
    bodySiteIds: ['chin'],
    side: 'right',
    widgetTop: 72,
    paths: ['M500 671 Q592 696 684 671 Q668 750 592 764 Q516 750 500 671 Z']
  },
  {
    id: 'neck',
    label: 'Neck & throat',
    bodySiteIds: ['neck', 'throat'],
    side: 'left',
    widgetTop: 88,
    paths: [
      'M430 700 C445 796 416 856 392 912 H792 C768 856 739 796 754 700 C704 758 480 758 430 700 Z'
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
