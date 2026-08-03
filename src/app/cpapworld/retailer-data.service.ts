import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { RetailerIndex } from './retailer-data';

@Injectable({ providedIn: 'root' })
export class RetailerDataService {
  private readonly index$ = inject(HttpClient)
    .get<RetailerIndex>('/data/retailers/index.json')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  getIndex(): Observable<RetailerIndex> {
    return this.index$;
  }
}
