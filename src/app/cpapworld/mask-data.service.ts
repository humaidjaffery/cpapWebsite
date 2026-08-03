import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of, shareReplay } from 'rxjs';

import { MaskIndex, MaskPrices, MaskProfile } from './mask-data';

@Injectable({ providedIn: 'root' })
export class MaskDataService {
  private readonly http = inject(HttpClient);
  private readonly index$ = this.http
    .get<MaskIndex>('/data/masks/index.json')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  getIndex(): Observable<MaskIndex> {
    return this.index$;
  }

  getProfile(slug: string): Observable<MaskProfile> {
    return this.http.get<MaskProfile>(`/data/masks/${encodeURIComponent(slug)}.json`);
  }

  getPrices(slug: string): Observable<MaskPrices | null> {
    return this.http
      .get<MaskPrices>(`/data/prices/${encodeURIComponent(slug)}.json`)
      .pipe(catchError(() => of(null)));
  }
}
