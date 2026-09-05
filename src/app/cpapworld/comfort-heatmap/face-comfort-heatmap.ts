import { Component, computed, input, signal } from '@angular/core';

import { BodySiteFinding, EvidenceStrength } from '../mask-data';
import {
  buildHeatmapRegions,
  HEATMAP_REGION_DEFINITIONS,
  HeatmapRegion,
  HeatmapRegionId
} from './heatmap-regions';

export interface HeatmapGradient {
  centerColor: string;
  centerHue: number;
  transitionColor: string;
  outerColor: string;
  solidStop: number;
  transitionStop: number;
  outerStop: number;
}

const EVIDENCE_GRADIENT_SPREAD: Record<
  EvidenceStrength,
  Pick<HeatmapGradient, 'solidStop' | 'transitionStop' | 'outerStop'>
> = {
  limited: { solidStop: 0.26, transitionStop: 0.62, outerStop: 0.88 },
  moderate: { solidStop: 0.46, transitionStop: 0.72, outerStop: 0.91 },
  strong: { solidStop: 0.68, transitionStop: 0.82, outerStop: 0.93 }
};

export function buildHeatmapGradient(
  positiveReviews: number,
  complaintReviews: number,
  evidenceStrength: EvidenceStrength
): HeatmapGradient {
  const evidenceCount = positiveReviews + complaintReviews;
  const balance = evidenceCount ? (positiveReviews - complaintReviews) / evidenceCount : 0;
  const severity = Math.abs(balance);
  const curvedSeverity = Math.pow(severity, 0.62);
  const centerHue =
    balance < 0 ? 36 - 36 * curvedSeverity : 36 + 86 * curvedSeverity;
  const centerLightness = 52 - 16 * Math.pow(severity, 0.72);
  const outerTargetHue = balance < 0 ? 48 : 58;
  const outerBlend = 0.25 + 0.6 * (1 - severity);
  const outerHue = centerHue + (outerTargetHue - centerHue) * outerBlend;
  const transitionHue = centerHue + (outerHue - centerHue) * 0.52;
  const spread = EVIDENCE_GRADIENT_SPREAD[evidenceStrength];

  return {
    centerColor: hsl(centerHue, 76, centerLightness),
    centerHue,
    transitionColor: hsl(transitionHue, 76, centerLightness + 6),
    outerColor: hsl(outerHue, 72, Math.min(68, centerLightness + 13)),
    ...spread
  };
}

function hsl(hue: number, saturation: number, lightness: number): string {
  return `hsl(${hue.toFixed(2)} ${saturation}% ${lightness.toFixed(2)}%)`;
}

@Component({
  selector: 'app-face-comfort-heatmap',
  templateUrl: './face-comfort-heatmap.html',
  styleUrl: './face-comfort-heatmap.css'
})
export class FaceComfortHeatmap {
  readonly maskName = input.required<string>();
  readonly bodySites = input.required<readonly BodySiteFinding[]>();

  protected readonly regionDefinitions = HEATMAP_REGION_DEFINITIONS;
  protected readonly detailedView = signal(false);
  protected readonly selectedRegionId = signal<HeatmapRegionId | null>(null);
  protected readonly regions = computed(() => buildHeatmapRegions(this.bodySites()));
  protected readonly regionsById = computed(
    () => new Map(this.regions().map((region) => [region.id, region]))
  );
  protected readonly regionGradients = computed(
    () =>
      new Map(
        this.regions().map((region) => [
          region.id,
          buildHeatmapGradient(
            region.positiveReviews,
            region.complaintReviews,
            region.evidenceStrength
          )
        ])
      )
  );
  protected readonly selectedRegion = computed(() => {
    const selectedId = this.selectedRegionId();
    return selectedId ? this.regionsById().get(selectedId) : undefined;
  });
  protected readonly summaryRegions = this.regions;

  protected toggleDetailedView(): void {
    this.detailedView.update((isDetailed) => !isDetailed);
  }

  protected selectRegion(id: HeatmapRegionId): void {
    if (!this.region(id)) return;
    this.selectedRegionId.set(id);
  }

  protected handleRegionKeydown(event: KeyboardEvent, id: HeatmapRegionId): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.selectRegion(id);
  }

  protected region(id: HeatmapRegionId): HeatmapRegion | undefined {
    return this.regionsById().get(id);
  }

  protected regionGradient(id: HeatmapRegionId): string {
    return this.regionGradientData(id) ? `url('#heat-${id}')` : 'transparent';
  }

  protected regionGradientData(id: HeatmapRegionId): HeatmapGradient | undefined {
    return this.regionGradients().get(id);
  }

  protected regionColor(id: HeatmapRegionId): string {
    return this.regionGradientData(id)?.centerColor ?? 'transparent';
  }

  protected regionOpacity(id: HeatmapRegionId): number {
    const region = this.region(id);
    if (!region) return 0;
    return Math.min(0.82, 0.52 + Math.log10(region.evidenceCount + 1) * 0.12);
  }

  protected regionTabIndex(id: HeatmapRegionId): number | null {
    return this.region(id) ? 0 : null;
  }

  protected regionAriaLabel(id: HeatmapRegionId): string {
    const region = this.region(id);
    return region ? `${region.label}: ${this.reportSummary(region)}` : 'No mapped evidence';
  }

  protected reportSummary(region: HeatmapRegion): string {
    const comfort = `${region.positiveReviews} comfort ${this.pluralize(region.positiveReviews, 'mention')}`;
    const discomfort =
      `${region.complaintReviews} discomfort ` +
      this.pluralize(region.complaintReviews, 'mention');
    return `${comfort}, ${discomfort}`;
  }

  protected toneLabel(region: HeatmapRegion): string {
    if (region.tone === 'comfort') return 'Leans comfortable';
    if (region.tone === 'discomfort') return 'Leans uncomfortable';
    return 'Mixed experience';
  }

  protected closeExpandedView(): void {
    this.selectedRegionId.set(null);
  }

  private pluralize(count: number, word: string): string {
    return count === 1 ? word : `${word}s`;
  }
}
