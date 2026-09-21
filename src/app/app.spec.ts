import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { routes, standaloneLibraryUrl } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the application router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('maps legacy library URLs to the standalone site', () => {
    expect(standaloneLibraryUrl('/library')).toBe('https://thecpaplibrary.com/');
    expect(standaloneLibraryUrl('/library/retailers')).toBe(
      'https://thecpaplibrary.com/retailers'
    );
    expect(standaloneLibraryUrl('/library/masks/resmed-airfit-p10?source=dreamseal')).toBe(
      'https://thecpaplibrary.com/masks/resmed-airfit-p10?source=dreamseal'
    );
  });

  it('guards every legacy library route with the external redirect', () => {
    for (const path of ['guide', 'library', 'library/masks/:maskSlug', 'compare', 'cpaplibrary', 'cpapworld']) {
      expect(routes.find((route) => route.path === path)?.canActivate?.length).toBe(1);
    }
  });
});
