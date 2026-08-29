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
  { path: 'guide', redirectTo: 'cpaplibrary', pathMatch: 'full' },
  { path: 'survey', component: Survey },
  { path: 'thank-you', component: ThankYou },
  { path: 'cpaplibrary', component: CpapWorld },
  { path: 'cpaplibrary/retailers', component: Retailers },
  { path: 'cpaplibrary/masks/:maskSlug', component: MaskDetail },
  { path: 'compare', component: ComparePage },
  { path: 'cpapworld', redirectTo: 'cpaplibrary', pathMatch: 'full' },
  { path: 'cpapworld/retailers', redirectTo: 'cpaplibrary/retailers', pathMatch: 'full' },
  {
    path: 'cpapworld/masks/:maskSlug',
    redirectTo: 'cpaplibrary/masks/:maskSlug',
    pathMatch: 'full'
  },
  ...developmentRoutes,
  { path: '**', redirectTo: '' }
];
