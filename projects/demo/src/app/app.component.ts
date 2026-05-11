import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { JasperEditorComponent } from 'ngx-jrxml-editor';

import { SAMPLE_SIMPLE, SAMPLE_TABLE } from './samples';
import { WorkspacePaneComponent } from './workspace/workspace-pane.component';
import { WorkspaceService } from './workspace/workspace.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JasperEditorComponent, WorkspacePaneComponent],
  template: `
    <header class="app-header">
      <h1>JRXML Editor Demo</h1>
      <nav>
        <button type="button" [class.active]="active() === 'simple'" (click)="loadSample('simple')">
          Simple report
        </button>
        <button type="button" [class.active]="active() === 'table'" (click)="loadSample('table')">
          Table component
        </button>
      </nav>
    </header>
    <main>
      <app-workspace-pane />
      @if (workspace.activePath(); as path) {
        <lib-jasper-editor
          [jrxml]="workspace.activeContent()"
          (jrxmlChange)="workspace.updateActiveContent($event)"
        />
      } @else {
        <div class="empty">
          No file selected. Add a JRXML from the workspace pane or load a workspace zip.
        </div>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100vh;
        font-family: -apple-system, system-ui, sans-serif;
      }
      .app-header {
        background: #1a1d27;
        color: #fff;
        padding: 12px 24px;
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .app-header h1 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      nav {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      nav button {
        background: transparent;
        color: #c8ccd9;
        border: 1px solid #3a3f4d;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        font-family: inherit;
      }
      nav button:hover {
        background: #2a2e39;
      }
      nav button.active {
        background: #4a6cf7;
        color: #fff;
        border-color: #4a6cf7;
      }
      main {
        flex: 1;
        overflow: hidden;
        display: flex;
        min-height: 0;
      }
      main lib-jasper-editor {
        flex: 1;
        min-width: 0;
      }
      .empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        font-size: 13px;
      }
    `,
  ],
})
export class AppComponent {
  protected readonly workspace = inject(WorkspaceService);
  protected readonly active = signal<'simple' | 'table' | 'custom'>('simple');

  constructor() {
    if (!this.workspace.hasPersistedState()) {
      this.workspace.resetWith('Simple Report', 'main.jrxml', SAMPLE_SIMPLE);
    }
  }

  protected loadSample(id: 'simple' | 'table'): void {
    this.active.set(id);
    if (id === 'simple') {
      this.workspace.resetWith('Simple Report', 'main.jrxml', SAMPLE_SIMPLE);
    } else {
      this.workspace.resetWith('Table Sample', 'main.jrxml', SAMPLE_TABLE);
    }
  }
}
