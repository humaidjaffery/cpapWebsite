import { Routes } from '@angular/router';
import { Hero } from './hero/hero';
import { Survey } from './survey/survey';
import { ThankYou } from './thank-you/thank-you';

export const routes: Routes = [
  { path: '', component: Hero },
  { path: 'survey', component: Survey },
  { path: 'thank-you', component: ThankYou },
  { path: '**', redirectTo: '' }
];
