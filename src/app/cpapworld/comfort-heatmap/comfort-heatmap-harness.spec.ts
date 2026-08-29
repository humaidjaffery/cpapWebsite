import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { MaskProfile } from '../mask-data';
import { MaskDataService } from '../mask-data.service';
import { routes } from '../../app.routes';
import { ComfortHeatmapHarness } from './comfort-heatmap-harness';

describe('ComfortHeatmapHarness', () => {
  let fixture: ComponentFixture<ComfortHeatmapHarness>;

  beforeEach(async () => {
    const profile = {
      slug: 'resmed-airfit-p10',
      name: 'ResMed AirFit P10',
      bodySites: [],
      coverage: { processedReviews: 100 }
    } as unknown as MaskProfile;

    await TestBed.configureTestingModule({
      imports: [ComfortHeatmapHarness, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        {
          provide: MaskDataService,
          useValue: { getProfile: (slug: string) => of({ ...profile, slug }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComfortHeatmapHarness);
    fixture.detectChanges();
  });

  it('loads the ten-mask Test Cohort into the development controls', () => {
    const options = fixture.nativeElement.querySelectorAll('select option');

    expect(options.length).toBe(10);
    expect(fixture.nativeElement.textContent).toContain('Heatmap development harness');
    expect(fixture.nativeElement.textContent).toContain('ResMed AirFit P10');
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toBe('/cpaplibrary');
  });

  it('is reachable from the development-only route', () => {
    expect(routes.some((route) => route.path === 'development/comfort-heatmap')).toBeTrue();
  });
});
