import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { SurveyQuestion, SurveyPage, SurveyValidator } from '../../models/survey-schema';

@Component({
  selector: 'app-survey-preview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatRadioModule, MatCheckboxModule, MatSlideToggleModule,
    MatCardModule, MatProgressBarModule, MatSnackBarModule
  ],
  template: `
    <div class="preview-header">
      <h2>Preview: {{ surveyName }}</h2>
      <button mat-button (click)="goBack()">
        <mat-icon>arrow_back</mat-icon> Back to Surveys
      </button>
    </div>

    @if (pages.length > 0) {
      <div class="survey-container">
        <!-- Progress -->
        @if (pages.length > 1) {
          <div class="page-progress">
            <span>Page {{ currentPageIndex + 1 }} of {{ pages.length }}</span>
            <mat-progress-bar mode="determinate"
              [value]="((currentPageIndex + 1) / pages.length) * 100">
            </mat-progress-bar>
          </div>
        }

        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>{{ currentPage.name }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (q of currentPage.elements; track q.name) {
              @if (isVisible(q)) {
                <div class="question-block">
                  <label class="question-label">
                    {{ q.title }}
                    @if (q.isRequired) { <span class="required-mark">*</span> }
                  </label>
                  @if (q.description) {
                    <p class="question-desc">{{ q.description }}</p>
                  }

                  @switch (q.type) {
                    @case ('text') {
                      <mat-form-field appearance="outline" class="full-width">
                        <input matInput
                          [type]="q.inputType || 'text'"
                          [(ngModel)]="formData[q.name]"
                          [placeholder]="q.placeholder || ''">
                      </mat-form-field>
                    }

                    @case ('comment') {
                      <mat-form-field appearance="outline" class="full-width">
                        <textarea matInput [(ngModel)]="formData[q.name]" rows="4"
                          [placeholder]="q.placeholder || ''"></textarea>
                      </mat-form-field>
                    }

                    @case ('radiogroup') {
                      <mat-radio-group [(ngModel)]="formData[q.name]" class="radio-group">
                        @for (choice of q.choices || []; track choice.value) {
                          <mat-radio-button [value]="choice.value">{{ choice.text }}</mat-radio-button>
                        }
                      </mat-radio-group>
                    }

                    @case ('checkbox') {
                      <div class="checkbox-group">
                        @for (choice of q.choices || []; track choice.value) {
                          <mat-checkbox
                            [checked]="isChecked(q.name, choice.value)"
                            (change)="toggleCheckbox(q.name, choice.value, $event.checked)">
                            {{ choice.text }}
                          </mat-checkbox>
                        }
                      </div>
                    }

                    @case ('dropdown') {
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-select [(ngModel)]="formData[q.name]" placeholder="Select...">
                          @for (choice of q.choices || []; track choice.value) {
                            <mat-option [value]="choice.value">{{ choice.text }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    }

                    @case ('rating') {
                      <div class="rating-group">
                        @for (r of getRatingRange(q); track r) {
                          <button mat-icon-button
                            [color]="(formData[q.name] || 0) >= r ? 'primary' : ''"
                            (click)="formData[q.name] = r">
                            <mat-icon>{{ (formData[q.name] || 0) >= r ? 'star' : 'star_border' }}</mat-icon>
                          </button>
                        }
                        <span class="rating-value">{{ formData[q.name] || '-' }}</span>
                      </div>
                    }

                    @case ('boolean') {
                      <mat-slide-toggle [(ngModel)]="formData[q.name]">
                        {{ formData[q.name] ? 'Yes' : 'No' }}
                      </mat-slide-toggle>
                    }

                    @case ('matrix') {
                      <div class="matrix-scroll">
                        <table class="matrix-table">
                          <thead>
                            <tr>
                              <th></th>
                              @for (col of q.columns || []; track col.value) {
                                <th>{{ col.text }}</th>
                              }
                            </tr>
                          </thead>
                          <tbody>
                            @for (row of q.rows || []; track row.value) {
                              <tr>
                                <td class="row-label">{{ row.text }}</td>
                                @for (col of q.columns || []; track col.value) {
                                  <td class="matrix-cell" (click)="setMatrixValue(q.name, row.value, col.value)">
                                    <mat-icon [class.selected-radio]="getMatrixValue(q.name, row.value) === col.value">
                                      {{ getMatrixValue(q.name, row.value) === col.value ? 'radio_button_checked' : 'radio_button_unchecked' }}
                                    </mat-icon>
                                  </td>
                                }
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }

                    @case ('expression') {
                      <div class="expression-value">
                        <mat-icon>calculate</mat-icon>
                        <span>{{ evaluateExpression(q) }}</span>
                      </div>
                    }

                    @case ('file') {
                      <div class="file-input">
                        <input type="file" (change)="onFileSelected($event, q.name)">
                        @if (formData[q.name]) {
                          <span class="file-name">{{ formData[q.name] }}</span>
                        }
                      </div>
                    }

                    @case ('paneldynamic') {
                      <div class="panel-placeholder">
                        <mat-icon>repeat</mat-icon>
                        <p>Repeat groups are fully rendered in the mobile app</p>
                      </div>
                    }

                    @default {
                      <p class="unsupported">Unsupported question type: {{ q.type }}</p>
                    }
                  }

                  <!-- Validation errors -->
                  @if (validationErrors[q.name]) {
                    <p class="validation-error">{{ validationErrors[q.name] }}</p>
                  }
                </div>
              }
            }
          </mat-card-content>
        </mat-card>

        <!-- Navigation buttons -->
        <div class="nav-buttons">
          @if (currentPageIndex > 0) {
            <button mat-raised-button (click)="previousPage()">
              <mat-icon>arrow_back</mat-icon> Previous
            </button>
          }
          <span class="spacer"></span>
          @if (currentPageIndex < pages.length - 1) {
            <button mat-raised-button color="primary" (click)="nextPage()">
              Next <mat-icon>arrow_forward</mat-icon>
            </button>
          } @else {
            <button mat-raised-button color="primary" (click)="completeSurvey()">
              Complete <mat-icon>check</mat-icon>
            </button>
          }
        </div>
      </div>
    } @else {
      <div class="empty-state">
        <mat-icon>info</mat-icon>
        <p>No survey data found</p>
      </div>
    }
  `,
  styles: [`
    .preview-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    .survey-container { max-width: 800px; margin: 0 auto; }

    .page-progress {
      margin-bottom: 16px; text-align: center;
      font-size: 13px; color: #666;
    }
    .page-progress mat-progress-bar { margin-top: 6px; }

    .form-card { margin-bottom: 16px; }

    .question-block {
      margin-bottom: 24px; padding-bottom: 16px;
      border-bottom: 1px solid #f0f0f0;
    }
    .question-block:last-child { border-bottom: none; }

    .question-label {
      display: block; font-size: 15px; font-weight: 500;
      margin-bottom: 4px; color: #333;
    }
    .required-mark { color: #d32f2f; font-weight: 700; }
    .question-desc { font-size: 13px; color: #888; margin: 2px 0 8px; }
    .full-width { width: 100%; }

    /* Radio */
    .radio-group {
      display: flex; flex-direction: column; gap: 4px;
      padding: 4px 0;
    }

    /* Checkbox */
    .checkbox-group {
      display: flex; flex-direction: column; gap: 4px;
      padding: 4px 0;
    }

    /* Rating */
    .rating-group {
      display: flex; align-items: center; gap: 2px; padding: 4px 0;
    }
    .rating-value {
      margin-left: 8px; font-weight: 600; font-size: 16px; color: #1976d2;
    }

    /* Matrix */
    .matrix-scroll { overflow-x: auto; }
    .matrix-table {
      border-collapse: collapse; width: 100%; margin: 8px 0;
    }
    .matrix-table th, .matrix-table td {
      padding: 8px 12px; text-align: center; border: 1px solid #e0e0e0;
    }
    .matrix-table th { background: #f5f5f5; font-size: 13px; font-weight: 600; }
    .row-label { text-align: left !important; font-weight: 500; }
    .matrix-cell { cursor: pointer; }
    .matrix-cell mat-icon { color: #bbb; }
    .matrix-cell .selected-radio { color: #1976d2; }

    /* Expression */
    .expression-value {
      display: flex; align-items: center; gap: 8px;
      padding: 12px; background: #f5f5f5; border-radius: 8px;
      font-size: 18px; font-weight: 600; color: #333;
    }
    .expression-value mat-icon { color: #888; }

    /* File */
    .file-input { padding: 8px 0; }
    .file-name { margin-left: 12px; font-size: 13px; color: #666; }

    /* Panel placeholder */
    .panel-placeholder {
      text-align: center; padding: 24px; background: #fafafa;
      border: 2px dashed #e0e0e0; border-radius: 8px; color: #999;
    }
    .panel-placeholder mat-icon { font-size: 36px; width: 36px; height: 36px; }

    .unsupported { color: #f44336; font-style: italic; }
    .validation-error {
      color: #d32f2f; font-size: 12px; margin: 4px 0 0;
      font-weight: 500;
    }

    /* Navigation */
    .nav-buttons { display: flex; align-items: center; margin-top: 16px; }
    .spacer { flex: 1; }

    .empty-state {
      text-align: center; padding: 80px 24px; color: #999;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }
  `]
})
export class SurveyPreviewComponent implements OnInit {
  surveyName = '';
  pages: SurveyPage[] = [];
  currentPageIndex = 0;
  formData: Record<string, any> = {};
  validationErrors: Record<string, string> = {};

  get currentPage(): SurveyPage {
    return this.pages[this.currentPageIndex] || { name: '', elements: [] };
  }

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const refid = this.route.snapshot.paramMap.get('refid');
    if (refid) {
      this.api.getSurveyByRefId(refid).subscribe({
        next: (survey) => {
          this.surveyName = survey.name;
          if (survey.data?.pages) {
            this.pages = survey.data.pages;
          }
        },
        error: () => this.snackBar.open('Failed to load survey', 'Close', { duration: 3000 })
      });
    }
  }

  // --- Skip Logic ---
  isVisible(q: SurveyQuestion): boolean {
    if (!q.visibleIf) return true;
    return this.evaluateCondition(q.visibleIf);
  }

  private evaluateCondition(expr: string): boolean {
    // Support 'and' / 'or' conjunctions
    if (/\s+or\s+/i.test(expr)) {
      return expr.split(/\s+or\s+/i).some(part => this.evaluateSingleCondition(part.trim()));
    }
    if (/\s+and\s+/i.test(expr)) {
      return expr.split(/\s+and\s+/i).every(part => this.evaluateSingleCondition(part.trim()));
    }
    return this.evaluateSingleCondition(expr);
  }

  private evaluateSingleCondition(expr: string): boolean {
    const regex = /\{(\w+)\}\s*(=|!=|<>|>|<|>=|<=|contains|notcontains|empty|notempty)\s*'?([^']*?)'?\s*$/;
    const match = expr.match(regex);
    if (!match) return true;
    const [, field, op, expected] = match;
    const rawVal = this.formData[field];
    const actual = String(rawVal ?? '');

    switch (op) {
      case '=': return actual === expected;
      case '!=': case '<>': return actual !== expected;
      case '>': return parseFloat(actual) > parseFloat(expected);
      case '<': return parseFloat(actual) < parseFloat(expected);
      case '>=': return parseFloat(actual) >= parseFloat(expected);
      case '<=': return parseFloat(actual) <= parseFloat(expected);
      case 'contains': return actual.includes(expected);
      case 'notcontains': return !actual.includes(expected);
      case 'empty': return rawVal == null || actual === '' || (Array.isArray(rawVal) && rawVal.length === 0);
      case 'notempty': return rawVal != null && actual !== '' && !(Array.isArray(rawVal) && rawVal.length === 0);
      default: return true;
    }
  }

  // --- Checkbox ---
  isChecked(questionName: string, value: string): boolean {
    const arr = this.formData[questionName];
    return Array.isArray(arr) && arr.includes(value);
  }

  toggleCheckbox(questionName: string, value: string, checked: boolean) {
    if (!Array.isArray(this.formData[questionName])) {
      this.formData[questionName] = [];
    }
    const arr = this.formData[questionName] as string[];
    if (checked) {
      if (!arr.includes(value)) arr.push(value);
    } else {
      const idx = arr.indexOf(value);
      if (idx >= 0) arr.splice(idx, 1);
    }
  }

  // --- Rating ---
  getRatingRange(q: SurveyQuestion): number[] {
    const min = q.rateMin ?? 1;
    const max = q.rateMax ?? 5;
    const range: number[] = [];
    for (let i = min; i <= max; i++) range.push(i);
    return range;
  }

  // --- Matrix ---
  getMatrixValue(questionName: string, rowValue: string): string {
    const data = this.formData[questionName];
    return (data && typeof data === 'object') ? (data[rowValue] || '') : '';
  }

  setMatrixValue(questionName: string, rowValue: string, colValue: string) {
    if (!this.formData[questionName] || typeof this.formData[questionName] !== 'object') {
      this.formData[questionName] = {};
    }
    this.formData[questionName][rowValue] = colValue;
  }

  // --- Expression ---
  evaluateExpression(q: SurveyQuestion): string {
    if (!q.expression) return '';
    let expr = q.expression;
    const fieldRegex = /\{(\w+)\}/g;
    let m;
    while ((m = fieldRegex.exec(q.expression)) !== null) {
      const val = this.formData[m[1]];
      expr = expr.replace(m[0], val != null ? String(val) : '0');
    }
    try {
      return String(Function('"use strict"; return (' + expr + ')')());
    } catch {
      return 'Error';
    }
  }

  // --- File ---
  onFileSelected(event: Event, questionName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.formData[questionName] = input.files[0].name;
    }
  }

  // --- Validation ---
  validatePage(): boolean {
    this.validationErrors = {};
    let valid = true;
    for (const q of this.currentPage.elements) {
      if (!this.isVisible(q)) continue;
      const error = this.validateQuestion(q);
      if (error) {
        this.validationErrors[q.name] = error;
        valid = false;
      }
    }
    return valid;
  }

  validateQuestion(q: SurveyQuestion): string | null {
    const val = this.formData[q.name];
    const strVal = val != null ? String(val) : '';

    // Required check
    if (q.isRequired) {
      if (val == null || strVal === '' || (Array.isArray(val) && val.length === 0)) {
        return 'This field is required';
      }
    }

    // Skip further validation if empty and not required
    if (val == null || strVal === '') return null;

    // Custom validators
    if (q.validators?.length) {
      for (const v of q.validators) {
        const err = this.runValidator(v, strVal);
        if (err) return err;
      }
    }
    return null;
  }

  private runValidator(v: SurveyValidator, strVal: string): string | null {
    switch (v.type) {
      case 'text':
        if (v.minLength != null && strVal.length < v.minLength) {
          return v.text || `Minimum length is ${v.minLength} characters`;
        }
        if (v.maxLength != null && strVal.length > v.maxLength) {
          return v.text || `Maximum length is ${v.maxLength} characters`;
        }
        break;
      case 'numeric': {
        const num = parseFloat(strVal);
        if (isNaN(num)) return v.text || 'Must be a number';
        if (v.minValue != null && num < v.minValue) {
          return v.text || `Minimum value is ${v.minValue}`;
        }
        if (v.maxValue != null && num > v.maxValue) {
          return v.text || `Maximum value is ${v.maxValue}`;
        }
        break;
      }
      case 'regex':
        if (v.regex) {
          try {
            if (!new RegExp(v.regex).test(strVal)) {
              return v.text || `Does not match the required pattern`;
            }
          } catch {
            return 'Invalid validation pattern';
          }
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
          return v.text || 'Please enter a valid email address';
        }
        break;
    }
    return null;
  }

  // --- Navigation ---
  previousPage() {
    if (this.currentPageIndex > 0) this.currentPageIndex--;
  }

  nextPage() {
    if (!this.validatePage()) {
      this.snackBar.open('Please fix the errors before continuing', 'Close', { duration: 3000 });
      return;
    }
    if (this.currentPageIndex < this.pages.length - 1) this.currentPageIndex++;
  }

  completeSurvey() {
    if (!this.validatePage()) {
      this.snackBar.open('Please fix the errors before submitting', 'Close', { duration: 3000 });
      return;
    }
    this.snackBar.open('Survey completed! (Preview mode - data not saved)', 'Close', { duration: 5000 });
    console.log('Survey response data:', JSON.stringify(this.formData, null, 2));
    alert('Survey completed! (Preview mode)\n\n' + JSON.stringify(this.formData, null, 2));
  }

  goBack() {
    this.router.navigate(['/surveys']);
  }
}
