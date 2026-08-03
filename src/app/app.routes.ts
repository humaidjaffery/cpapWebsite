import { Routes } from '@angular/router';
import { CpapWorld } from './cpapworld/cpapworld';
import { MaskDetail } from './cpapworld/mask-detail/mask-detail';
import { Retailers } from './cpapworld/retailers/retailers';
import { Hero } from './hero/hero';
import { Guide } from './guide/guide';
import { Survey } from './survey/survey';
import { ThankYou } from './thank-you/thank-you';

export const routes: Routes = [
  { path: '', component: Hero },
  { path: 'guide', component: Guide },
  { path: 'survey', component: Survey },
  { path: 'thank-you', component: ThankYou },
  { path: 'cpapworld', component: CpapWorld },
  { path: 'cpapworld/retailers', component: Retailers },
  { path: 'cpapworld/masks/:maskSlug', component: MaskDetail },
  { path: '**', redirectTo: '' }
];
