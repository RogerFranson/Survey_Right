export interface SurveyChoice {
  value: string;
  text: string;
}

export interface SurveyValidator {
  type: 'text' | 'numeric' | 'regex' | 'email' | 'expression';
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  regex?: string;
  text?: string; // custom error message
  expression?: string;
}

export interface SurveyCondition {
  field: string;
  operator: string;
  value: string;
}

export interface SurveyQuestion {
  type: string;
  name: string;
  title: string;
  isRequired?: boolean;
  visibleIf?: string;
  description?: string;
  inputType?: string;
  placeholder?: string;
  choices?: SurveyChoice[];
  columns?: SurveyChoice[];
  rows?: SurveyChoice[];
  rateMin?: number;
  rateMax?: number;
  rateStep?: number;
  expression?: string;
  validators?: SurveyValidator[];
  templateElements?: SurveyQuestion[];
  panelCount?: number;
  minPanelCount?: number;
  maxPanelCount?: number;
}

export interface SurveyPage {
  name: string;
  elements: SurveyQuestion[];
}

export interface SurveySchema {
  pages: SurveyPage[];
}

export const CONDITION_OPERATORS = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not equals' },
  { value: '>', label: 'Greater than' },
  { value: '<', label: 'Less than' },
  { value: '>=', label: 'Greater or equal' },
  { value: '<=', label: 'Less or equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'notcontains', label: 'Does not contain' },
  { value: 'empty', label: 'Is empty' },
  { value: 'notempty', label: 'Is not empty' },
];

export const VALIDATOR_TYPES = [
  { value: 'text', label: 'Text Length' },
  { value: 'numeric', label: 'Numeric Range' },
  { value: 'regex', label: 'Pattern (Regex)' },
  { value: 'email', label: 'Email Format' },
];

export interface QuestionTypeInfo {
  type: string;
  label: string;
  icon: string;
  category: string;
}

export const QUESTION_TYPES: QuestionTypeInfo[] = [
  { type: 'text', label: 'Text Input', icon: 'text_fields', category: 'Input' },
  { type: 'comment', label: 'Long Text', icon: 'notes', category: 'Input' },
  { type: 'radiogroup', label: 'Single Choice', icon: 'radio_button_checked', category: 'Choice' },
  { type: 'checkbox', label: 'Multiple Choice', icon: 'check_box', category: 'Choice' },
  { type: 'dropdown', label: 'Dropdown', icon: 'arrow_drop_down_circle', category: 'Choice' },
  { type: 'rating', label: 'Rating', icon: 'star', category: 'Advanced' },
  { type: 'boolean', label: 'Yes / No', icon: 'toggle_on', category: 'Advanced' },
  { type: 'matrix', label: 'Matrix', icon: 'grid_on', category: 'Advanced' },
  { type: 'file', label: 'File Upload', icon: 'attach_file', category: 'Advanced' },
  { type: 'expression', label: 'Calculated', icon: 'calculate', category: 'Advanced' },
  { type: 'paneldynamic', label: 'Repeat Group', icon: 'repeat', category: 'Advanced' },
];
