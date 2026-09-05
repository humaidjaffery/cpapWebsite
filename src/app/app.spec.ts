import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { routes } from './app.routes';

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

  it('uses the library routes as the canonical mask catalog URLs', () => {
    expect(routes.some((route) => route.path === 'library' && route.component)).toBeTrue();
    expect(
      routes.some((route) => route.path === 'library/masks/:maskSlug' && route.component)
    ).toBeTrue();
  });

  it('redirects the legacy catalog URLs to the library', () => {
    expect(routes.find((route) => route.path === 'cpaplibrary')?.redirectTo).toBe('library');
    expect(routes.find((route) => route.path === 'cpapworld')?.redirectTo).toBe('library');
  });
});
