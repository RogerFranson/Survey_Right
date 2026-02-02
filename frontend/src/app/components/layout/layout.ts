import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar color="primary" class="toolbar">
      <span class="logo">Survey Right</span>
      <nav class="nav-links">
        <a mat-button routerLink="/surveys" routerLinkActive="active">
          <mat-icon>list</mat-icon> Surveys
        </a>
        <a mat-button routerLink="/surveys/build/new" routerLinkActive="active">
          <mat-icon>add_circle</mat-icon> New Survey
        </a>
      </nav>
    </mat-toolbar>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: [`
    .toolbar {
      display: flex;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      font-weight: 700;
      font-size: 20px;
      margin-right: 24px;
    }
    .nav-links {
      display: flex;
      gap: 8px;
    }
    .nav-links a.active {
      background: rgba(255,255,255,0.15);
    }
    .content {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
  `]
})
export class LayoutComponent {}
