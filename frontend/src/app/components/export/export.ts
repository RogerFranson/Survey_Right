import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService, Survey } from '../../services/api.service';

@Component({
  selector: 'app-export',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDividerModule],
  template: `
    <div class="export-page">
      <h1>Export Survey</h1>

      @if (survey) {
        <mat-card class="export-card">
          <mat-card-header>
            <mat-card-title>{{ survey.name }}</mat-card-title>
            <mat-card-subtitle>Survey Details</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="key-display">
              <label>Survey Key (use in mobile app):</label>
              <div class="key-box">
                <code>{{ survey.refid }}</code>
                <button mat-icon-button (click)="copyKey()">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
            </div>

            <mat-divider></mat-divider>

            <div class="instructions">
              <h3>How to use with the mobile app:</h3>
              <ol>
                <li>Download the <strong>Survey Right</strong> mobile app (Flutter)</li>
                <li>Open the app and tap <strong>"Enter Survey Key"</strong></li>
                <li>Enter this key: <code>{{ survey.refid }}</code></li>
                <li>The survey form will load automatically</li>
                <li>Collect data offline - it syncs when connected</li>
              </ol>
            </div>

            <mat-divider></mat-divider>

            <div class="export-actions">
              <h3>Export Data</h3>
              <button mat-raised-button (click)="exportCSV()">
                <mat-icon>table_chart</mat-icon> Export Responses as CSV
              </button>
              <button mat-raised-button (click)="exportJSON()">
                <mat-icon>data_object</mat-icon> Export Survey Definition (JSON)
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <button mat-button (click)="goBack()">
        <mat-icon>arrow_back</mat-icon> Back to Surveys
      </button>
    </div>
  `,
  styles: [`
    .export-page { max-width: 700px; margin: 0 auto; }
    .export-card { margin-bottom: 24px; }
    .key-display { margin: 16px 0; }
    .key-display label { font-size: 14px; color: #666; display: block; margin-bottom: 8px; }
    .key-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f5f5f5;
      padding: 12px 16px;
      border-radius: 8px;
      border: 2px dashed #ccc;
    }
    .key-box code {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 2px;
      flex: 1;
    }
    .instructions { margin: 24px 0; }
    .instructions ol { padding-left: 20px; }
    .instructions li { margin: 8px 0; line-height: 1.6; }
    .export-actions {
      margin: 24px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
    mat-divider { margin: 16px 0; }
  `]
})
export class ExportComponent implements OnInit {
  survey: Survey | null = null;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const refid = this.route.snapshot.paramMap.get('refid');
    if (refid) {
      this.api.getSurveyByRefId(refid).subscribe({
        next: (s) => this.survey = s
      });
    }
  }

  copyKey() {
    if (this.survey) {
      navigator.clipboard.writeText(this.survey.refid);
    }
  }

  exportCSV() {
    if (this.survey) {
      window.open(this.api.getExportUrl(this.survey.refid), '_blank');
    }
  }

  exportJSON() {
    if (this.survey) {
      const blob = new Blob([JSON.stringify(this.survey.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.survey.refid}_definition.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  goBack() {
    this.router.navigate(['/surveys']);
  }
}
