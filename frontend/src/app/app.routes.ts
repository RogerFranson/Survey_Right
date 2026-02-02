import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'surveys', pathMatch: 'full' },
      {
        path: 'surveys',
        loadComponent: () => import('./components/survey-list/survey-list').then(m => m.SurveyListComponent)
      },
      {
        path: 'surveys/build/:refid',
        loadComponent: () => import('./components/survey-builder/survey-builder').then(m => m.SurveyBuilderComponent)
      },
      {
        path: 'surveys/preview/:refid',
        loadComponent: () => import('./components/survey-preview/survey-preview').then(m => m.SurveyPreviewComponent)
      },
      {
        path: 'surveys/export/:refid',
        loadComponent: () => import('./components/export/export').then(m => m.ExportComponent)
      },
      {
        path: 'dashboard/:refid',
        loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent)
      }
    ]
  }
];
