import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Survey {
  id: string;
  refid: string;
  name: string;
  secname: string;
  data: any;
  created_at: string;
  updated_at: string;
}

export interface SurveyResponse {
  id: string;
  refid: string;
  name: string;
  secname: string;
  data: any;
  created_at: string;
  updated_at: string;
}

export interface ResponseList {
  count: number;
  responses: SurveyResponse[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3080/api';
  private wsUrl = 'ws://localhost:3080';

  constructor(private http: HttpClient) {}

  // Survey endpoints
  createSurvey(survey: { refid: string; name: string; secname?: string; data: any }): Observable<Survey> {
    return this.http.post<Survey>(`${this.baseUrl}/surveys`, survey);
  }

  getSurveys(): Observable<Survey[]> {
    return this.http.get<Survey[]>(`${this.baseUrl}/surveys`);
  }

  getSurveyByRefId(refid: string): Observable<Survey> {
    return this.http.get<Survey>(`${this.baseUrl}/surveys/${refid}`);
  }

  updateSurvey(id: string, data: { name?: string; secname?: string; data?: any }): Observable<Survey> {
    return this.http.put<Survey>(`${this.baseUrl}/surveys/${id}`, data);
  }

  deleteSurvey(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/surveys/${id}`);
  }

  // Response endpoints
  getResponses(refid: string): Observable<ResponseList> {
    return this.http.get<ResponseList>(`${this.baseUrl}/responses/${refid}`);
  }

  getExportUrl(refid: string): string {
    return `${this.baseUrl.replace('/api', '')}/api/export/${refid}`;
  }

  // WebSocket for live dashboard
  connectDashboard(refid: string): WebSocket {
    return new WebSocket(`${this.wsUrl}/ws/dashboard/${refid}`);
  }
}
