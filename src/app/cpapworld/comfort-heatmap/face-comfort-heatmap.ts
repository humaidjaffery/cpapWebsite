import { Component, computed, input, signal } from '@angular/core';

import { BodySiteFinding } from '../mask-data';
import {
  buildHeatmapRegions,
  HEATMAP_REGION_DEFINITIONS,
  HeatmapRegion,
  HeatmapRegionId
} from './heatmap-regions';

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

  protected regionFill(id: HeatmapRegionId): string {
    const region = this.region(id);
    if (!region) return '#ebe8ee';
    if (region.tone === 'comfort') return '#7761b7';
    if (region.tone === 'discomfort') return '#dc7359';
    return '#d2a84b';
  }

  protected regionOpacity(id: HeatmapRegionId): number {
    const region = this.region(id);
    if (!region) return 0.42;
    return Math.min(0.95, 0.58 + Math.log10(region.evidenceCount + 1) * 0.15);
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
