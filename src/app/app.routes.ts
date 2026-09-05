import { Routes } from '@angular/router';
import { CpapWorld } from './cpapworld/cpapworld';
import { MaskDetail } from './cpapworld/mask-detail/mask-detail';
import { Retailers } from './cpapworld/retailers/retailers';
import { Hero } from './hero/hero';
import { Survey } from './survey/survey';
import { ThankYou } from './thank-you/thank-you';
import { ComparePage } from './cpapworld/comparison/compare-page';
import { environment } from '../environments/environment';

const developmentRoutes: Routes = environment.production
  ? []
  : [
      {
        path: 'development/comfort-heatmap',
        loadComponent: () =>
          import('./cpapworld/comfort-heatmap/comfort-heatmap-harness').then(
            (module) => module.ComfortHeatmapHarness
          )
      }
    ];

export const routes: Routes = [
  { path: '', component: Hero },
  { path: 'guide', redirectTo: 'library', pathMatch: 'full' },
  { path: 'survey', component: Survey },
  { path: 'thank-you', component: ThankYou },
  { path: 'library', component: CpapWorld },
  { path: 'library/retailers', component: Retailers },
  { path: 'library/masks/:maskSlug', component: MaskDetail },
  { path: 'compare', component: ComparePage },
  { path: 'cpaplibrary', redirectTo: 'library', pathMatch: 'full' },
  { path: 'cpaplibrary/retailers', redirectTo: 'library/retailers', pathMatch: 'full' },
  {
    path: 'cpaplibrary/masks/:maskSlug',
    redirectTo: 'library/masks/:maskSlug',
    pathMatch: 'full'
  },
  { path: 'cpapworld', redirectTo: 'library', pathMatch: 'full' },
  { path: 'cpapworld/retailers', redirectTo: 'library/retailers', pathMatch: 'full' },
  {
    path: 'cpapworld/masks/:maskSlug',
    redirectTo: 'library/masks/:maskSlug',
    pathMatch: 'full'
  },
  ...developmentRoutes,
  { path: '**', redirectTo: '' }
];
