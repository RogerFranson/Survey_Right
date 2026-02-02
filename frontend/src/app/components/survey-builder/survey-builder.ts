import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../services/api.service';
import { SurveyQuestion, SurveyPage, SurveyValidator, SurveyCondition, QUESTION_TYPES, QuestionTypeInfo, CONDITION_OPERATORS, VALIDATOR_TYPES } from '../../models/survey-schema';

@Component({
  selector: 'app-survey-builder',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DragDropModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatCheckboxModule, MatSnackBarModule, MatTooltipModule
  ],
  template: `
    <!-- Header with metadata and save -->
    <div class="builder-header">
      <div class="form-fields">
        <mat-form-field appearance="outline">
          <mat-label>Survey Name</mat-label>
          <input matInput [(ngModel)]="surveyName" placeholder="Enter survey name">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Survey Key (RefID)</mat-label>
          <input matInput [(ngModel)]="surveyRefId" placeholder="unique-key" [disabled]="isEditing">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Section Name</mat-label>
          <input matInput [(ngModel)]="surveySecName" placeholder="Optional section">
        </mat-form-field>
      </div>
      <div class="actions">
        <button mat-raised-button color="primary" (click)="saveSurvey()">
          <mat-icon>save</mat-icon> {{ isEditing ? 'Update' : 'Save' }} Survey
        </button>
        <button mat-button (click)="goBack()">Cancel</button>
      </div>
    </div>

    <!-- Three-column builder -->
    <div class="builder-body">

      <!-- LEFT: Question Toolbox -->
      <div class="toolbox-panel">
        <h3>Add Question</h3>
        @for (cat of categories; track cat) {
          <div class="toolbox-category">
            <h4>{{ cat }}</h4>
            @for (qt of getTypesByCategory(cat); track qt.type) {
              <button mat-stroked-button class="toolbox-btn" (click)="addQuestion(qt.type)" [matTooltip]="qt.label">
                <mat-icon>{{ qt.icon }}</mat-icon>
                <span>{{ qt.label }}</span>
              </button>
            }
          </div>
        }
      </div>

      <!-- CENTER: Canvas -->
      <div class="canvas-panel">
        <!-- Page tabs -->
        <div class="page-tabs">
          @for (page of pages; track $index) {
            <button mat-button [class.active-tab]="$index === currentPageIndex" (click)="selectPage($index)">
              {{ page.name }}
            </button>
            @if (pages.length > 1) {
              <button mat-icon-button class="page-delete" (click)="removePage($index); $event.stopPropagation()" matTooltip="Delete page">
                <mat-icon>close</mat-icon>
              </button>
            }
          }
          <button mat-icon-button (click)="addPage()" matTooltip="Add page">
            <mat-icon>add</mat-icon>
          </button>
          <span class="spacer"></span>
          <mat-form-field appearance="outline" class="page-name-field">
            <mat-label>Page Name</mat-label>
            <input matInput [(ngModel)]="pages[currentPageIndex].name">
          </mat-form-field>
        </div>

        <!-- Question list with drag-drop -->
        <div class="question-list" cdkDropList (cdkDropListDropped)="dropQuestion($event)">
          @if (currentPageElements.length === 0) {
            <div class="empty-canvas">
              <mat-icon>touch_app</mat-icon>
              <p>Click a question type from the left panel to add it here</p>
            </div>
          }
          @for (q of currentPageElements; track $index) {
            <div class="question-card" cdkDrag
                 [class.selected]="selectedQuestionIndex === $index"
                 (click)="selectQuestion($index)">
              <div class="drag-handle" cdkDragHandle>
                <mat-icon>drag_indicator</mat-icon>
              </div>
              <div class="question-content">
                <div class="question-top">
                  <span class="type-badge">{{ getTypeLabel(q.type) }}</span>
                  <span class="question-title">{{ q.title || q.name }}</span>
                </div>
                <div class="question-meta">
                  @if (q.isRequired) { <span class="badge required">Required</span> }
                  @if (q.visibleIf) { <span class="badge logic">Has Logic</span> }
                  @if (q.validators?.length) { <span class="badge validators">Validated</span> }
                  @if (q.choices?.length) { <span class="badge choices">{{ q.choices!.length }} choices</span> }
                </div>
              </div>
              <div class="question-actions">
                <button mat-icon-button (click)="duplicateQuestion($index); $event.stopPropagation()" matTooltip="Duplicate">
                  <mat-icon>content_copy</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="removeQuestion($index); $event.stopPropagation()" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- RIGHT: Properties -->
      <div class="properties-panel">
        @if (selectedQuestion) {
          <h3>Question Properties</h3>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Question Type</mat-label>
            <mat-select [(ngModel)]="selectedQuestion.type" (ngModelChange)="onTypeChanged()">
              @for (qt of questionTypes; track qt.type) {
                <mat-option [value]="qt.type">{{ qt.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Variable Name</mat-label>
            <input matInput [(ngModel)]="selectedQuestion.name">
            <mat-hint>Used as the field key in responses</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Question Title</mat-label>
            <textarea matInput [(ngModel)]="selectedQuestion.title" rows="2"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description / Help Text</mat-label>
            <input matInput [(ngModel)]="selectedQuestion.description">
          </mat-form-field>

          @if (selectedQuestion.type === 'text') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Input Type</mat-label>
              <mat-select [(ngModel)]="selectedQuestion.inputType">
                <mat-option value="text">Text</mat-option>
                <mat-option value="number">Number</mat-option>
                <mat-option value="email">Email</mat-option>
                <mat-option value="tel">Phone</mat-option>
                <mat-option value="date">Date</mat-option>
                <mat-option value="time">Time</mat-option>
                <mat-option value="url">URL</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Placeholder</mat-label>
              <input matInput [(ngModel)]="selectedQuestion.placeholder">
            </mat-form-field>
          }

          <div class="checkbox-field">
            <mat-checkbox [(ngModel)]="selectedQuestion.isRequired">Required</mat-checkbox>
          </div>

          <!-- Conditional Logic Builder -->
          <div class="section-header">
            <h4>Conditional Visibility</h4>
            <button mat-icon-button color="primary" (click)="addCondition()" matTooltip="Add condition">
              <mat-icon>add_circle</mat-icon>
            </button>
          </div>
          @if (editingConditions.length > 0) {
            @for (cond of editingConditions; track $index) {
              <div class="condition-row">
                <mat-form-field appearance="outline" class="cond-field">
                  <mat-label>Question</mat-label>
                  <mat-select [(ngModel)]="cond.field">
                    @for (q of getAllQuestionNames(); track q) {
                      <mat-option [value]="q">{{ q }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="cond-field">
                  <mat-label>Operator</mat-label>
                  <mat-select [(ngModel)]="cond.operator" (ngModelChange)="rebuildVisibleIf()">
                    @for (op of conditionOperators; track op.value) {
                      <mat-option [value]="op.value">{{ op.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                @if (cond.operator !== 'empty' && cond.operator !== 'notempty') {
                  <mat-form-field appearance="outline" class="cond-field">
                    <mat-label>Value</mat-label>
                    @if (getChoicesForQuestion(cond.field).length > 0) {
                      <mat-select [(ngModel)]="cond.value" (ngModelChange)="rebuildVisibleIf()">
                        @for (ch of getChoicesForQuestion(cond.field); track ch.value) {
                          <mat-option [value]="ch.value">{{ ch.text }}</mat-option>
                        }
                      </mat-select>
                    } @else {
                      <input matInput [(ngModel)]="cond.value" (ngModelChange)="rebuildVisibleIf()">
                    }
                  </mat-form-field>
                }
                <button mat-icon-button color="warn" (click)="removeCondition($index)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }
            <p class="hint-text">Expression: {{ selectedQuestion.visibleIf || '(none)' }}</p>
          } @else {
            <p class="hint-text">No conditions — question is always visible</p>
          }

          <!-- Validation Rules -->
          <div class="section-header">
            <h4>Validation Rules</h4>
            <button mat-icon-button color="primary" (click)="addValidator()" matTooltip="Add validation rule">
              <mat-icon>add_circle</mat-icon>
            </button>
          </div>
          @if (selectedQuestion.validators?.length) {
            @for (v of selectedQuestion.validators!; track $index) {
              <div class="validator-block">
                <div class="validator-header">
                  <mat-form-field appearance="outline" class="validator-type-field">
                    <mat-label>Rule Type</mat-label>
                    <mat-select [(ngModel)]="v.type">
                      @for (vt of validatorTypes; track vt.value) {
                        <mat-option [value]="vt.value">{{ vt.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <button mat-icon-button color="warn" (click)="removeValidator($index)">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>

                @if (v.type === 'text') {
                  <div class="inline-fields">
                    <mat-form-field appearance="outline">
                      <mat-label>Min Length</mat-label>
                      <input matInput type="number" [(ngModel)]="v.minLength">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Max Length</mat-label>
                      <input matInput type="number" [(ngModel)]="v.maxLength">
                    </mat-form-field>
                  </div>
                }

                @if (v.type === 'numeric') {
                  <div class="inline-fields">
                    <mat-form-field appearance="outline">
                      <mat-label>Min Value</mat-label>
                      <input matInput type="number" [(ngModel)]="v.minValue">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Max Value</mat-label>
                      <input matInput type="number" [(ngModel)]="v.maxValue">
                    </mat-form-field>
                  </div>
                }

                @if (v.type === 'regex') {
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Pattern (Regex)</mat-label>
                    <input matInput [(ngModel)]="v.regex" placeholder="^[A-Z]{2}\\d{4}$">
                  </mat-form-field>
                }

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Error Message</mat-label>
                  <input matInput [(ngModel)]="v.text" placeholder="Custom error message">
                </mat-form-field>
              </div>
            }
          } @else {
            <p class="hint-text">No validation rules added</p>
          }

          <!-- Choice editor (radiogroup, checkbox, dropdown) -->
          @if (isChoiceType(selectedQuestion.type)) {
            <div class="section-header">
              <h4>Choices</h4>
              <button mat-icon-button color="primary" (click)="addChoice()" matTooltip="Add choice">
                <mat-icon>add_circle</mat-icon>
              </button>
            </div>
            @if (selectedQuestion.choices) {
              @for (choice of selectedQuestion.choices; track $index) {
                <div class="choice-row">
                  <mat-form-field appearance="outline" class="choice-field">
                    <mat-label>Value</mat-label>
                    <input matInput [(ngModel)]="choice.value">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="choice-field">
                    <mat-label>Label</mat-label>
                    <input matInput [(ngModel)]="choice.text">
                  </mat-form-field>
                  <button mat-icon-button color="warn" (click)="removeChoice($index)">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
            }
          }

          <!-- Rating properties -->
          @if (selectedQuestion.type === 'rating') {
            <h4>Rating Range</h4>
            <div class="inline-fields">
              <mat-form-field appearance="outline">
                <mat-label>Min</mat-label>
                <input matInput type="number" [(ngModel)]="selectedQuestion.rateMin">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Max</mat-label>
                <input matInput type="number" [(ngModel)]="selectedQuestion.rateMax">
              </mat-form-field>
            </div>
          }

          <!-- Matrix properties -->
          @if (selectedQuestion.type === 'matrix') {
            <div class="section-header">
              <h4>Columns</h4>
              <button mat-icon-button color="primary" (click)="addMatrixColumn()" matTooltip="Add column">
                <mat-icon>add_circle</mat-icon>
              </button>
            </div>
            @if (selectedQuestion.columns) {
              @for (col of selectedQuestion.columns; track $index) {
                <div class="choice-row">
                  <mat-form-field appearance="outline" class="choice-field">
                    <mat-label>Value</mat-label>
                    <input matInput [(ngModel)]="col.value">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="choice-field">
                    <mat-label>Label</mat-label>
                    <input matInput [(ngModel)]="col.text">
                  </mat-form-field>
                  <button mat-icon-button color="warn" (click)="removeMatrixColumn($index)">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
            }

            <div class="section-header">
              <h4>Rows</h4>
              <button mat-icon-button color="primary" (click)="addMatrixRow()" matTooltip="Add row">
                <mat-icon>add_circle</mat-icon>
              </button>
            </div>
            @if (selectedQuestion.rows) {
              @for (row of selectedQuestion.rows; track $index) {
                <div class="choice-row">
                  <mat-form-field appearance="outline" class="choice-field">
                    <mat-label>Value</mat-label>
                    <input matInput [(ngModel)]="row.value">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="choice-field">
                    <mat-label>Label</mat-label>
                    <input matInput [(ngModel)]="row.text">
                  </mat-form-field>
                  <button mat-icon-button color="warn" (click)="removeMatrixRow($index)">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
            }
          }

          <!-- Expression -->
          @if (selectedQuestion.type === 'expression') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Expression</mat-label>
              <input matInput [(ngModel)]="selectedQuestion.expression"
                     placeholder="{{ '{' }}q1{{ '}' }} + {{ '{' }}q2{{ '}' }}">
              <mat-hint>Use {{ '{' }}name{{ '}' }} to reference answers</mat-hint>
            </mat-form-field>
          }

          <!-- Repeat Group -->
          @if (selectedQuestion.type === 'paneldynamic') {
            <h4>Repeat Group Settings</h4>
            <div class="inline-fields">
              <mat-form-field appearance="outline">
                <mat-label>Min Panels</mat-label>
                <input matInput type="number" [(ngModel)]="selectedQuestion.minPanelCount">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Max Panels</mat-label>
                <input matInput type="number" [(ngModel)]="selectedQuestion.maxPanelCount">
              </mat-form-field>
            </div>
            <p class="hint-text">Add sub-questions to the repeat group using the JSON export</p>
          }

        } @else {
          <div class="empty-properties">
            <mat-icon>settings</mat-icon>
            <p>Select a question to edit its properties</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: calc(100vh - 64px); overflow: hidden; }

    .builder-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 12px 16px; border-bottom: 1px solid #e0e0e0; background: #fafafa;
      flex-wrap: wrap; gap: 12px;
    }
    .form-fields { display: flex; gap: 12px; flex-wrap: wrap; }
    .form-fields mat-form-field { width: 200px; }
    .actions { display: flex; gap: 8px; align-items: center; }

    .builder-body { display: flex; height: calc(100vh - 150px); }

    /* Toolbox */
    .toolbox-panel {
      width: 210px; min-width: 210px; border-right: 1px solid #e0e0e0;
      padding: 12px; overflow-y: auto; background: #f9f9f9;
    }
    .toolbox-panel h3 { margin: 0 0 12px; font-size: 15px; color: #333; }
    .toolbox-category h4 {
      margin: 14px 0 6px; font-size: 11px; text-transform: uppercase;
      color: #888; letter-spacing: 1px;
    }
    .toolbox-btn {
      display: flex; align-items: center; gap: 8px; width: 100%;
      justify-content: flex-start; margin-bottom: 3px; font-size: 12px;
      min-height: 36px; padding: 4px 12px;
    }
    .toolbox-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Canvas */
    .canvas-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

    .page-tabs {
      display: flex; align-items: center; padding: 6px 12px;
      border-bottom: 1px solid #e0e0e0; background: #fff;
      gap: 2px; flex-wrap: wrap;
    }
    .active-tab { background: #e3f2fd !important; font-weight: 600; }
    .page-delete { transform: scale(0.65); margin-left: -8px; }
    .spacer { flex: 1; }
    .page-name-field { width: 160px; font-size: 13px; }
    .page-name-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

    .question-list { flex: 1; overflow-y: auto; padding: 16px; }

    .empty-canvas {
      text-align: center; padding: 60px 24px; color: #999;
    }
    .empty-canvas mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }

    .question-card {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      margin-bottom: 6px; border: 2px solid #e0e0e0; border-radius: 8px;
      background: #fff; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .question-card:hover { border-color: #90caf9; }
    .question-card.selected { border-color: #1976d2; box-shadow: 0 0 0 1px #1976d2; }
    .drag-handle { cursor: grab; color: #bbb; display: flex; }
    .question-content { flex: 1; min-width: 0; }
    .question-top { display: flex; align-items: center; gap: 8px; }
    .type-badge {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      background: #e3f2fd; color: #1565c0; font-size: 10px;
      font-weight: 600; text-transform: uppercase; white-space: nowrap;
    }
    .question-title {
      font-size: 13px; font-weight: 500; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .question-meta { display: flex; gap: 6px; margin-top: 3px; }
    .badge {
      display: inline-block; padding: 1px 6px; border-radius: 3px;
      font-size: 10px; font-weight: 600;
    }
    .badge.required { background: #fce4ec; color: #c62828; }
    .badge.logic { background: #e8f5e9; color: #2e7d32; }
    .badge.validators { background: #fff3e0; color: #e65100; }
    .badge.choices { background: #f3e5f5; color: #7b1fa2; }
    .question-actions { display: flex; }

    /* Properties */
    .properties-panel {
      width: 310px; min-width: 310px; border-left: 1px solid #e0e0e0;
      padding: 12px; overflow-y: auto; background: #fafafa;
    }
    .properties-panel h3 { margin: 0 0 12px; font-size: 15px; color: #333; }
    .properties-panel h4 { margin: 14px 0 6px; font-size: 13px; color: #555; }
    .full-width { width: 100%; }
    .checkbox-field { margin: 8px 0 16px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; }
    .choice-row { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
    .choice-field { flex: 1; }
    .inline-fields { display: flex; gap: 8px; }
    .inline-fields mat-form-field { flex: 1; }
    .hint-text { font-size: 12px; color: #888; font-style: italic; margin-top: 4px; }

    /* Condition builder */
    .condition-row {
      display: flex; align-items: center; gap: 4px; margin-bottom: 4px;
      flex-wrap: wrap;
    }
    .cond-field { flex: 1; min-width: 70px; }

    /* Validator block */
    .validator-block {
      margin-bottom: 8px; padding: 8px;
      border: 1px solid #e0e0e0; border-radius: 6px; background: #fff;
    }
    .validator-header { display: flex; align-items: center; gap: 4px; }
    .validator-type-field { flex: 1; }

    .empty-properties {
      text-align: center; padding: 40px 16px; color: #999;
    }
    .empty-properties mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }

    /* CDK Drag-drop */
    .cdk-drag-preview {
      border: 2px solid #1976d2; border-radius: 8px; background: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 10px 12px;
      display: flex; align-items: center; gap: 8px;
    }
    .cdk-drag-placeholder {
      background: #e3f2fd; border: 2px dashed #90caf9;
      border-radius: 8px; min-height: 50px;
    }
    .cdk-drag-animating { transition: transform 200ms ease; }
  `]
})
export class SurveyBuilderComponent implements OnInit {
  surveyName = '';
  surveyRefId = '';
  surveySecName = '';
  isEditing = false;
  surveyId = '';

  pages: SurveyPage[] = [{ name: 'Page 1', elements: [] }];
  currentPageIndex = 0;
  selectedQuestionIndex = -1;
  selectedQuestion: SurveyQuestion | null = null;

  questionTypes = QUESTION_TYPES;
  conditionOperators = CONDITION_OPERATORS;
  validatorTypes = VALIDATOR_TYPES;
  categories: string[] = [];
  editingConditions: SurveyCondition[] = [];
  private questionCounter = 0;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.categories = [...new Set(QUESTION_TYPES.map(qt => qt.category))];
  }

  get currentPageElements(): SurveyQuestion[] {
    return this.pages[this.currentPageIndex]?.elements || [];
  }

  ngOnInit() {
    const refid = this.route.snapshot.paramMap.get('refid');
    if (refid && refid !== 'new') {
      this.isEditing = true;
      this.api.getSurveyByRefId(refid).subscribe({
        next: (survey) => {
          this.surveyId = survey.id;
          this.surveyName = survey.name;
          this.surveyRefId = survey.refid;
          this.surveySecName = survey.secname || '';
          this.loadSurveyData(survey.data);
        },
        error: () => this.snackBar.open('Survey not found', 'Close', { duration: 3000 })
      });
    }
  }

  loadSurveyData(data: any) {
    if (data?.pages?.length > 0) {
      this.pages = data.pages;
      let maxNum = 0;
      for (const page of this.pages) {
        for (const q of page.elements) {
          const match = q.name?.match(/\d+/);
          if (match) maxNum = Math.max(maxNum, parseInt(match[0], 10));
        }
      }
      this.questionCounter = maxNum;
    }
    this.currentPageIndex = 0;
    this.selectedQuestionIndex = -1;
    this.selectedQuestion = null;
  }

  // --- Page operations ---
  selectPage(index: number) {
    this.currentPageIndex = index;
    this.selectedQuestionIndex = -1;
    this.selectedQuestion = null;
  }

  addPage() {
    this.pages.push({ name: `Page ${this.pages.length + 1}`, elements: [] });
    this.currentPageIndex = this.pages.length - 1;
    this.selectedQuestionIndex = -1;
    this.selectedQuestion = null;
  }

  removePage(index: number) {
    if (this.pages.length <= 1) return;
    this.pages.splice(index, 1);
    if (this.currentPageIndex >= this.pages.length) {
      this.currentPageIndex = this.pages.length - 1;
    }
    this.selectedQuestionIndex = -1;
    this.selectedQuestion = null;
  }

  // --- Question operations ---
  addQuestion(type: string) {
    this.questionCounter++;
    const q: SurveyQuestion = {
      type,
      name: `q${this.questionCounter}`,
      title: `New ${this.getTypeLabel(type)} Question`,
    };
    if (['radiogroup', 'checkbox', 'dropdown'].includes(type)) {
      q.choices = [
        { value: 'option1', text: 'Option 1' },
        { value: 'option2', text: 'Option 2' },
        { value: 'option3', text: 'Option 3' },
      ];
    }
    if (type === 'rating') { q.rateMin = 1; q.rateMax = 5; }
    if (type === 'matrix') {
      q.columns = [
        { value: 'col1', text: 'Column 1' },
        { value: 'col2', text: 'Column 2' },
        { value: 'col3', text: 'Column 3' },
      ];
      q.rows = [
        { value: 'row1', text: 'Row 1' },
        { value: 'row2', text: 'Row 2' },
      ];
    }
    if (type === 'text') { q.inputType = 'text'; }
    if (type === 'expression') { q.expression = ''; }
    if (type === 'paneldynamic') {
      q.templateElements = [];
      q.panelCount = 1;
      q.minPanelCount = 1;
      q.maxPanelCount = 10;
    }
    this.pages[this.currentPageIndex].elements.push(q);
    this.selectQuestion(this.pages[this.currentPageIndex].elements.length - 1);
  }

  selectQuestion(index: number) {
    this.selectedQuestionIndex = index;
    this.selectedQuestion = this.pages[this.currentPageIndex].elements[index] ?? null;
    this.editingConditions = this.selectedQuestion
      ? this.parseVisibleIf(this.selectedQuestion.visibleIf || '')
      : [];
  }

  removeQuestion(index: number) {
    this.pages[this.currentPageIndex].elements.splice(index, 1);
    if (this.selectedQuestionIndex === index) {
      this.selectedQuestionIndex = -1;
      this.selectedQuestion = null;
    } else if (this.selectedQuestionIndex > index) {
      this.selectedQuestionIndex--;
    }
  }

  duplicateQuestion(index: number) {
    const original = this.pages[this.currentPageIndex].elements[index];
    this.questionCounter++;
    const copy: SurveyQuestion = JSON.parse(JSON.stringify(original));
    copy.name = `q${this.questionCounter}`;
    this.pages[this.currentPageIndex].elements.splice(index + 1, 0, copy);
    this.selectQuestion(index + 1);
  }

  dropQuestion(event: CdkDragDrop<SurveyQuestion[]>) {
    moveItemInArray(this.pages[this.currentPageIndex].elements, event.previousIndex, event.currentIndex);
    if (this.selectedQuestionIndex === event.previousIndex) {
      this.selectedQuestionIndex = event.currentIndex;
      this.selectedQuestion = this.pages[this.currentPageIndex].elements[event.currentIndex];
    }
  }

  onTypeChanged() {
    if (!this.selectedQuestion) return;
    const q = this.selectedQuestion;
    if (this.isChoiceType(q.type) && !q.choices?.length) {
      q.choices = [
        { value: 'option1', text: 'Option 1' },
        { value: 'option2', text: 'Option 2' },
      ];
    }
    if (q.type === 'rating' && q.rateMin == null) { q.rateMin = 1; q.rateMax = 5; }
    if (q.type === 'matrix' && !q.columns?.length) {
      q.columns = [{ value: 'col1', text: 'Column 1' }, { value: 'col2', text: 'Column 2' }];
      q.rows = [{ value: 'row1', text: 'Row 1' }, { value: 'row2', text: 'Row 2' }];
    }
    if (q.type === 'text' && !q.inputType) { q.inputType = 'text'; }
    if (q.type === 'expression' && !q.expression) { q.expression = ''; }
  }

  // --- Choice helpers ---
  addChoice() {
    if (!this.selectedQuestion) return;
    if (!this.selectedQuestion.choices) this.selectedQuestion.choices = [];
    const n = this.selectedQuestion.choices.length + 1;
    this.selectedQuestion.choices.push({ value: `option${n}`, text: `Option ${n}` });
  }

  removeChoice(index: number) {
    this.selectedQuestion?.choices?.splice(index, 1);
  }

  // --- Matrix helpers ---
  addMatrixColumn() {
    if (!this.selectedQuestion) return;
    if (!this.selectedQuestion.columns) this.selectedQuestion.columns = [];
    const n = this.selectedQuestion.columns.length + 1;
    this.selectedQuestion.columns.push({ value: `col${n}`, text: `Column ${n}` });
  }

  removeMatrixColumn(index: number) {
    this.selectedQuestion?.columns?.splice(index, 1);
  }

  addMatrixRow() {
    if (!this.selectedQuestion) return;
    if (!this.selectedQuestion.rows) this.selectedQuestion.rows = [];
    const n = this.selectedQuestion.rows.length + 1;
    this.selectedQuestion.rows.push({ value: `row${n}`, text: `Row ${n}` });
  }

  removeMatrixRow(index: number) {
    this.selectedQuestion?.rows?.splice(index, 1);
  }

  // --- Condition builder ---
  parseVisibleIf(expr: string): SurveyCondition[] {
    if (!expr) return [];
    const conditions: SurveyCondition[] = [];
    // Match patterns like {field} operator 'value' or {field} operator value
    const regex = /\{(\w+)\}\s*(=|!=|<>|>|<|>=|<=|contains|notcontains|empty|notempty)\s*'?([^']*?)'?(?:\s+and\s+|\s+or\s+|$)/gi;
    let match;
    while ((match = regex.exec(expr)) !== null) {
      conditions.push({
        field: match[1],
        operator: match[2],
        value: match[3] || ''
      });
    }
    if (conditions.length === 0 && expr.trim()) {
      // Fallback: single simple condition
      const simple = /\{(\w+)\}\s*(=|!=|<>|>|<|>=|<=|contains|notcontains|empty|notempty)\s*'?([^']*)'?/i.exec(expr);
      if (simple) {
        conditions.push({ field: simple[1], operator: simple[2], value: simple[3] || '' });
      }
    }
    return conditions;
  }

  rebuildVisibleIf() {
    if (!this.selectedQuestion) return;
    const parts = this.editingConditions
      .filter(c => c.field)
      .map(c => {
        if (c.operator === 'empty') return `{${c.field}} empty`;
        if (c.operator === 'notempty') return `{${c.field}} notempty`;
        return `{${c.field}} ${c.operator} '${c.value}'`;
      });
    this.selectedQuestion.visibleIf = parts.length > 0 ? parts.join(' and ') : '';
  }

  addCondition() {
    this.editingConditions.push({ field: '', operator: '=', value: '' });
  }

  removeCondition(index: number) {
    this.editingConditions.splice(index, 1);
    this.rebuildVisibleIf();
  }

  getAllQuestionNames(): string[] {
    const names: string[] = [];
    for (const page of this.pages) {
      for (const q of page.elements) {
        if (this.selectedQuestion && q.name !== this.selectedQuestion.name) {
          names.push(q.name);
        }
      }
    }
    return names;
  }

  getChoicesForQuestion(name: string): { value: string; text: string }[] {
    for (const page of this.pages) {
      for (const q of page.elements) {
        if (q.name === name && q.choices?.length) {
          return q.choices;
        }
      }
    }
    return [];
  }

  // --- Validator helpers ---
  addValidator() {
    if (!this.selectedQuestion) return;
    if (!this.selectedQuestion.validators) this.selectedQuestion.validators = [];
    this.selectedQuestion.validators.push({ type: 'text', text: '' });
  }

  removeValidator(index: number) {
    this.selectedQuestion?.validators?.splice(index, 1);
  }

  // --- Utility ---
  getTypeLabel(type: string): string {
    return QUESTION_TYPES.find(qt => qt.type === type)?.label || type;
  }

  getTypesByCategory(category: string): QuestionTypeInfo[] {
    return QUESTION_TYPES.filter(qt => qt.category === category);
  }

  isChoiceType(type: string): boolean {
    return ['radiogroup', 'checkbox', 'dropdown'].includes(type);
  }

  // --- Save ---
  saveSurvey() {
    if (!this.surveyName || !this.surveyRefId) {
      this.snackBar.open('Name and Key are required', 'Close', { duration: 3000 });
      return;
    }
    const surveyData = { pages: this.cleanPages() };

    if (this.isEditing) {
      this.api.updateSurvey(this.surveyId, {
        name: this.surveyName,
        secname: this.surveySecName,
        data: surveyData
      }).subscribe({
        next: () => {
          this.snackBar.open('Survey updated!', 'Close', { duration: 2000 });
          this.router.navigate(['/surveys']);
        },
        error: (err) => this.snackBar.open('Update failed: ' + err.message, 'Close', { duration: 3000 })
      });
    } else {
      this.api.createSurvey({
        refid: this.surveyRefId,
        name: this.surveyName,
        secname: this.surveySecName,
        data: surveyData
      }).subscribe({
        next: () => {
          this.snackBar.open('Survey created!', 'Close', { duration: 2000 });
          this.router.navigate(['/surveys']);
        },
        error: (err) => this.snackBar.open('Create failed: ' + err.message, 'Close', { duration: 3000 })
      });
    }
  }

  private cleanPages(): SurveyPage[] {
    return this.pages.map(page => ({
      name: page.name,
      elements: page.elements.map(q => {
        const clean: any = { type: q.type, name: q.name, title: q.title };
        if (q.isRequired) clean.isRequired = true;
        if (q.visibleIf) clean.visibleIf = q.visibleIf;
        if (q.description) clean.description = q.description;
        if (q.inputType && q.inputType !== 'text') clean.inputType = q.inputType;
        if (q.placeholder) clean.placeholder = q.placeholder;
        if (q.choices?.length) clean.choices = q.choices;
        if (q.columns?.length) clean.columns = q.columns;
        if (q.rows?.length) clean.rows = q.rows;
        if (q.rateMin != null) clean.rateMin = q.rateMin;
        if (q.rateMax != null) clean.rateMax = q.rateMax;
        if (q.expression) clean.expression = q.expression;
        if (q.validators?.length) {
          clean.validators = q.validators.map((v: SurveyValidator) => {
            const cv: any = { type: v.type };
            if (v.text) cv.text = v.text;
            if (v.type === 'text') {
              if (v.minLength != null) cv.minLength = v.minLength;
              if (v.maxLength != null) cv.maxLength = v.maxLength;
            }
            if (v.type === 'numeric') {
              if (v.minValue != null) cv.minValue = v.minValue;
              if (v.maxValue != null) cv.maxValue = v.maxValue;
            }
            if (v.type === 'regex' && v.regex) cv.regex = v.regex;
            return cv;
          });
        }
        if (q.templateElements?.length) clean.templateElements = q.templateElements;
        if (q.panelCount != null) clean.panelCount = q.panelCount;
        if (q.minPanelCount != null) clean.minPanelCount = q.minPanelCount;
        if (q.maxPanelCount != null) clean.maxPanelCount = q.maxPanelCount;
        return clean;
      })
    }));
  }

  goBack() {
    this.router.navigate(['/surveys']);
  }
}
