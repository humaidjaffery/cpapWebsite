import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ComparisonSummary {
  decisionTakeaway: string;
  reasonsToPreferMask1: string[];
  reasonsToPreferMask2: string[];
  similarities: string[];
  importantUncertainties: string[];
}

export interface ComparisonSummaryResponse {
  source: 'cache' | 'generated';
  summary: ComparisonSummary;
}

@Injectable({ providedIn: 'root' })
export class ComparisonSummaryService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `https://us-central1-${environment.firebase.projectId}.cloudfunctions.net/getMaskComparisonSummary`;

  getSummary(
    mask1: string,
    mask2: string,
    comparisonRevision: string
  ): Observable<ComparisonSummaryResponse> {
    return this.http.post<ComparisonSummaryResponse>(this.endpoint, {
      mask1,
      mask2,
      comparisonRevision
    });
  }
}
