// max-flow.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MaxFlowRequest {
  graph: number[][];
  capacities: { [key: string]: number };
  source: number;
  sink: number;
}

export interface MaxFlowResponse {
  max_flow: number;
  flows: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class MaxFlowService {
  private apiUrl = 'http://localhost:5000/maxflow'; // L'URL de votre API Flask

  constructor(private http: HttpClient) { }

  calculateMaxFlow(request: MaxFlowRequest): Observable<MaxFlowResponse> {
    return this.http.post<MaxFlowResponse>(this.apiUrl, request);
  }
}
