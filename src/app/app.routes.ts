import { Routes } from '@angular/router';
import { CpapWorld } from './cpapworld/cpapworld';
import { MaskDetail } from './cpapworld/mask-detail/mask-detail';
import { Retailers } from './cpapworld/retailers/retailers';
import { Hero } from './hero/hero';
import { Survey } from './survey/survey';
import { ThankYou } from './thank-you/thank-you';

export const routes: Routes = [
  { path: '', component: Hero },
  { path: 'guide', redirectTo: 'cpaplibrary', pathMatch: 'full' },
  { path: 'survey', component: Survey },
  { path: 'thank-you', component: ThankYou },
  { path: 'cpaplibrary', component: CpapWorld },
  { path: 'cpaplibrary/retailers', component: Retailers },
  { path: 'cpaplibrary/masks/:maskSlug', component: MaskDetail },
  { path: 'cpapworld', redirectTo: 'cpaplibrary', pathMatch: 'full' },
  { path: 'cpapworld/retailers', redirectTo: 'cpaplibrary/retailers', pathMatch: 'full' },
  {
    path: 'cpapworld/masks/:maskSlug',
    redirectTo: 'cpaplibrary/masks/:maskSlug',
    pathMatch: 'full'
  },
  { path: '**', redirectTo: '' }
];
