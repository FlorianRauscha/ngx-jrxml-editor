import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { EditorStore } from '../state/editor-store';
import { type ValidationIssue, validateReport } from '../state/validation';

@Component({
  selector: 'lib-jasper-validation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  styles: [
    `
      :host {
        display: block;
        background: #f7f8fb;
        font-family: -apple-system, system-ui, sans-serif;
        font-size: 12px;
        height: 100%;
        overflow-y: auto;
      }
      header {
        padding: 12px 16px;
        border-bottom: 1px solid #e1e4eb;
        font-weight: 600;
        background: #fff;
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .v-counts {
        margin-left: auto;
        display: flex;
        gap: 6px;
      }
      .v-pill {
        font-family: ui-monospace, Menlo, monospace;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 10px;
        line-height: 1.4;
      }
      .v-pill.err { background: #fdecea; color: #b00020; }
      .v-pill.warn { background: #fff4e0; color: #b45309; }
      .v-pill.ok { background: #e6f4ea; color: #1b873a; }
      ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      li {
        padding: 8px 16px;
        border-bottom: 1px solid #eef0f4;
        cursor: pointer;
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        gap: 8px;
        align-items: start;
      }
      li:hover { background: #f3f5f9; }
      li.err .v-icon { color: #b00020; }
      li.warn .v-icon { color: #b45309; }
      .v-icon {
        font-family: ui-monospace, Menlo, monospace;
        font-weight: 700;
        text-align: center;
      }
      .v-message {
        font-size: 12px;
        color: #1a1d27;
        word-wrap: break-word;
      }
      .v-detail {
        font-size: 11px;
        color: #6b7280;
        margin-top: 2px;
      }
      .v-where {
        font-family: ui-monospace, Menlo, monospace;
        font-size: 10px;
        color: #4a6cf7;
        margin-top: 2px;
      }
      .v-empty {
        padding: 24px 16px;
        color: #888;
        text-align: center;
      }
    `,
  ],
  template: `
    <header>
      <span>Validation</span>
      <span class="v-counts">
        @if (errorCount() > 0) {
          <span class="v-pill err">{{ errorCount() }} error{{ errorCount() === 1 ? '' : 's' }}</span>
        }
        @if (warningCount() > 0) {
          <span class="v-pill warn">{{ warningCount() }} warning{{ warningCount() === 1 ? '' : 's' }}</span>
        }
        @if (errorCount() === 0 && warningCount() === 0) {
          <span class="v-pill ok">all clear</span>
        }
      </span>
    </header>
    @if (issues().length === 0) {
      <div class="v-empty">No problems detected.</div>
    } @else {
      <ul>
        @for (issue of issues(); track issue.id) {
          <li [class.err]="issue.severity === 'error'" [class.warn]="issue.severity === 'warning'" (click)="goTo(issue)">
            <span class="v-icon">{{ issue.severity === 'error' ? '✕' : '!' }}</span>
            <div>
              <div class="v-message">{{ issue.message }}</div>
              @if (issue.detail) {
                <div class="v-detail">{{ issue.detail }}</div>
              }
              @if (issue.path) {
                <div class="v-where">
                  {{ issue.path.section }}{{ issue.path.groupName ? ' / ' + issue.path.groupName : '' }}
                  · #{{ issue.path.indices.join('.') }}
                </div>
              }
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class JasperValidationComponent {
  private readonly store = inject(EditorStore);

  protected readonly issues = computed<ValidationIssue[]>(() => {
    const r = this.store.report();
    if (!r) return [];
    return validateReport(r);
  });

  protected readonly errorCount = computed(
    () => this.issues().filter((i) => i.severity === 'error').length,
  );
  protected readonly warningCount = computed(
    () => this.issues().filter((i) => i.severity === 'warning').length,
  );

  protected goTo(issue: ValidationIssue): void {
    if (!issue.path) return;
    this.store.select(issue.path);
  }
}
