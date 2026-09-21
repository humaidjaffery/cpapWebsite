import { CanActivateFn, Routes } from '@angular/router';
import { Hero } from './hero/hero';
import { Survey } from './survey/survey';
import { ThankYou } from './thank-you/thank-you';

const CPAP_LIBRARY_ORIGIN = 'https://thecpaplibrary.com';

export function standaloneLibraryUrl(legacyUrl: string): string {
  const url = new URL(legacyUrl, CPAP_LIBRARY_ORIGIN);
  const standalonePath =
    url.pathname === '/guide'
      ? '/'
      : url.pathname.replace(/^\/(?:library|cpaplibrary|cpapworld)(?=\/|$)/, '') || '/';

  return `${CPAP_LIBRARY_ORIGIN}${standalonePath}${url.search}${url.hash}`;
}

const redirectToStandaloneLibrary: CanActivateFn = (_route, state) => {
  window.location.replace(standaloneLibraryUrl(state.url));
  return false;
};

export const routes: Routes = [
  { path: '', component: Hero },
  { path: 'survey', component: Survey },
  { path: 'thank-you', component: ThankYou },
  { path: 'guide', component: Hero, canActivate: [redirectToStandaloneLibrary] },
  { path: 'library', component: Hero, canActivate: [redirectToStandaloneLibrary] },
  { path: 'library/retailers', component: Hero, canActivate: [redirectToStandaloneLibrary] },
  { path: 'library/masks/:maskSlug', component: Hero, canActivate: [redirectToStandaloneLibrary] },
  { path: 'compare', component: Hero, canActivate: [redirectToStandaloneLibrary] },
  { path: 'cpaplibrary', component: Hero, canActivate: [redirectToStandaloneLibrary] },
  { path: 'cpaplibrary/retailers', component: Hero, canActivate: [redirectToStandaloneLibrary] },
  { path: 'cpaplibrary/masks/:maskSlug', component: Hero, canActivate: [redirectToStandaloneLibrary] },
  { path: 'cpapworld', component: Hero, canActivate: [redirectToStandaloneLibrary] },
  { path: 'cpapworld/retailers', component: Hero, canActivate: [redirectToStandaloneLibrary] },
  { path: 'cpapworld/masks/:maskSlug', component: Hero, canActivate: [redirectToStandaloneLibrary] },
  { path: '**', redirectTo: '' }
];
