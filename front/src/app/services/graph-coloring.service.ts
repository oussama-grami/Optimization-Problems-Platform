import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface GraphColoringResult {
  chromaticNumber: number;
  coloredGraph: number[];
}

@Injectable({
  providedIn: 'root',
})
export class GraphColoringService {
  private apiUrl = 'http://localhost:5000'; // Replace with your API URL

  constructor(private http: HttpClient) {}

  colorGraph(adjacencyMatrix: number[][]): Observable<GraphColoringResult> {
    console.log('Adjacency Matrix:', adjacencyMatrix);
    return this.http.post<GraphColoringResult>(
      `${this.apiUrl}/graph-coloring`,
      {
        adjacencyMatrix,
      }
    );
  }

  checkService(): Observable<any> {
    return this.http.get(`${this.apiUrl}/graph-coloring/check`);
  }
}
