import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService, SurveyResponse, Survey } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatBadgeModule, MatChipsModule],
  template: `
    <div class="dashboard-header">
      <div>
        <h1>Dashboard: {{ survey?.name }}</h1>
        <p class="subtitle">Key: {{ refid }}</p>
      </div>
      <div class="stats">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ totalResponses }}</div>
            <div class="stat-label">Total Responses</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card live" [class.connected]="wsConnected">
          <mat-card-content>
            <div class="stat-value">
              <mat-icon>{{ wsConnected ? 'wifi' : 'wifi_off' }}</mat-icon>
            </div>
            <div class="stat-label">{{ wsConnected ? 'Live' : 'Disconnected' }}</div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>

    @if (newResponseCount > 0) {
      <div class="new-response-banner">
        <mat-chip-set>
          <mat-chip color="primary" highlighted>{{ newResponseCount }} new response(s) received live</mat-chip>
        </mat-chip-set>
      </div>
    }

    <mat-card>
      <mat-card-header>
        <mat-card-title>Responses</mat-card-title>
        <span class="spacer"></span>
        <button mat-button (click)="exportCSV()">
          <mat-icon>download</mat-icon> Export CSV
        </button>
        <button mat-button (click)="refresh()">
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      </mat-card-header>
      <mat-card-content>
        @if (responses.length === 0) {
          <p class="empty">No responses yet. Share the survey key with data collectors.</p>
        } @else {
          <div class="table-container">
            <table mat-table [dataSource]="responses">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Respondent</th>
                <td mat-cell *matCellDef="let r">{{ r.name || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="secname">
                <th mat-header-cell *matHeaderCellDef>Section</th>
                <td mat-cell *matCellDef="let r">{{ r.secname || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="data">
                <th mat-header-cell *matHeaderCellDef>Data (JSON)</th>
                <td mat-cell *matCellDef="let r" class="data-cell">{{ r.data | json }}</td>
              </ng-container>
              <ng-container matColumnDef="created_at">
                <th mat-header-cell *matHeaderCellDef>Submitted</th>
                <td mat-cell *matCellDef="let r">{{ r.created_at | date:'short' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" [class.new-row]="row._isNew"></tr>
            </table>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .subtitle { color: #888; margin: 4px 0; }
    .stats {
      display: flex;
      gap: 12px;
    }
    .stat-card {
      text-align: center;
      min-width: 120px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
    }
    .stat-label {
      font-size: 12px;
      color: #888;
    }
    .stat-card.live.connected .stat-value mat-icon {
      color: #4caf50;
    }
    .new-response-banner {
      margin-bottom: 16px;
    }
    mat-card-header {
      display: flex;
      align-items: center;
    }
    .spacer { flex: 1; }
    .table-container {
      overflow-x: auto;
    }
    .data-cell {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
      font-size: 12px;
    }
    .empty {
      text-align: center;
      padding: 40px;
      color: #999;
    }
    .new-row {
      background-color: #e8f5e9 !important;
      animation: fadeIn 0.5s ease;
    }
    @keyframes fadeIn {
      from { background-color: #a5d6a7; }
      to { background-color: #e8f5e9; }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  refid = '';
  survey: Survey | null = null;
  responses: (SurveyResponse & { _isNew?: boolean })[] = [];
  totalResponses = 0;
  displayedColumns = ['name', 'secname', 'data', 'created_at'];
  wsConnected = false;
  newResponseCount = 0;

  private ws: WebSocket | null = null;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.refid = this.route.snapshot.paramMap.get('refid') || '';
    this.loadSurvey();
    this.loadResponses();
    this.connectWs();
  }

  ngOnDestroy() {
    this.ws?.close();
  }

  loadSurvey() {
    this.api.getSurveyByRefId(this.refid).subscribe({
      next: (s) => this.survey = s
    });
  }

  loadResponses() {
    this.api.getResponses(this.refid).subscribe({
      next: (res) => {
        this.responses = res.responses;
        this.totalResponses = res.count;
      }
    });
  }

  connectWs() {
    this.ws = this.api.connectDashboard(this.refid);
    this.ws.onopen = () => this.wsConnected = true;
    this.ws.onclose = () => {
      this.wsConnected = false;
      setTimeout(() => this.connectWs(), 3000);
    };
    this.ws.onmessage = (event) => {
      const resp = JSON.parse(event.data);
      resp._isNew = true;
      this.responses = [resp, ...this.responses];
      this.totalResponses++;
      this.newResponseCount++;
    };
  }

  refresh() {
    this.newResponseCount = 0;
    this.loadResponses();
  }

  exportCSV() {
    window.open(this.api.getExportUrl(this.refid), '_blank');
  }
}
