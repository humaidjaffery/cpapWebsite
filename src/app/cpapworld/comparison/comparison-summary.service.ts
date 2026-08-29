import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ComparisonSummaryRequest,
  ComparisonSummaryResponse
} from '../../../../shared/comparison-model';

export type {
  ComparisonSummary,
  ComparisonSummaryResponse
} from '../../../../shared/comparison-model';

@Injectable({ providedIn: 'root' })
export class ComparisonSummaryService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `https://us-central1-${environment.firebase.projectId}.cloudfunctions.net/getMaskComparisonSummary`;

  getSummary(
    mask1: string,
    mask2: string,
    comparisonRevision: string
  ): Observable<ComparisonSummaryResponse> {
    const request: ComparisonSummaryRequest = {
      mask1,
      mask2,
      comparisonRevision
    };
    return this.http.post<ComparisonSummaryResponse>(this.endpoint, request);
  }
}
