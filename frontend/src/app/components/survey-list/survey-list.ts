import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService, Survey } from '../../services/api.service';

@Component({
  selector: 'app-survey-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatDialogModule],
  template: `
    <div class="page-header">
      <h1>My Surveys</h1>
      <button mat-raised-button color="primary" (click)="createNew()">
        <mat-icon>add</mat-icon> New Survey
      </button>
    </div>

    @if (surveys.length === 0) {
      <div class="empty-state">
        <mat-icon class="empty-icon">poll</mat-icon>
        <h2>No surveys yet</h2>
        <p>Create your first survey to get started</p>
        <button mat-raised-button color="primary" (click)="createNew()">Create Survey</button>
      </div>
    }

    <div class="survey-grid">
      @for (survey of surveys; track survey.id) {
        <mat-card class="survey-card">
          <mat-card-header>
            <mat-card-title>{{ survey.name }}</mat-card-title>
            <mat-card-subtitle>Key: {{ survey.refid }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (survey.secname) {
              <mat-chip-set>
                <mat-chip>{{ survey.secname }}</mat-chip>
              </mat-chip-set>
            }
            <p class="date">Created: {{ survey.created_at | date:'medium' }}</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-button (click)="editSurvey(survey)">
              <mat-icon>edit</mat-icon> Edit
            </button>
            <button mat-button (click)="previewSurvey(survey)">
              <mat-icon>visibility</mat-icon> Preview
            </button>
            <button mat-button (click)="viewDashboard(survey)">
              <mat-icon>dashboard</mat-icon> Dashboard
            </button>
            <button mat-button (click)="exportSurvey(survey)">
              <mat-icon>download</mat-icon> Export
            </button>
            <button mat-button color="warn" (click)="deleteSurvey(survey)">
              <mat-icon>delete</mat-icon>
            </button>
          </mat-card-actions>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .empty-state {
      text-align: center;
      padding: 80px 24px;
      color: #666;
    }
    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
    }
    .survey-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 16px;
    }
    .survey-card {
      cursor: default;
    }
    .date {
      color: #888;
      font-size: 12px;
      margin-top: 8px;
    }
  `]
})
export class SurveyListComponent implements OnInit {
  surveys: Survey[] = [];

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSurveys();
  }

  loadSurveys() {
    this.api.getSurveys().subscribe({
      next: (surveys) => this.surveys = surveys,
      error: (err) => console.error('Failed to load surveys', err)
    });
  }

  createNew() {
    this.router.navigate(['/surveys/build/new']);
  }

  editSurvey(survey: Survey) {
    this.router.navigate(['/surveys/build', survey.refid]);
  }

  previewSurvey(survey: Survey) {
    this.router.navigate(['/surveys/preview', survey.refid]);
  }

  viewDashboard(survey: Survey) {
    this.router.navigate(['/dashboard', survey.refid]);
  }

  exportSurvey(survey: Survey) {
    this.router.navigate(['/surveys/export', survey.refid]);
  }

  deleteSurvey(survey: Survey) {
    if (confirm(`Delete survey "${survey.name}"? This will also delete all responses.`)) {
      this.api.deleteSurvey(survey.id).subscribe({
        next: () => this.loadSurveys(),
        error: (err) => console.error('Failed to delete survey', err)
      });
    }
  }
}
