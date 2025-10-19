import { Routes } from '@angular/router';
import { Hero } from './hero/hero';
import { ThankYou } from './thank-you/thank-you';

export const routes: Routes = [
  { path: '', component: Hero },
  { path: 'thank-you', component: ThankYou },
  { path: '**', redirectTo: '' }
];
