import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';

import { JasperCanvasComponent } from './canvas/jasper-canvas.component';
import { JasperContextMenuComponent } from './canvas/jasper-context-menu.component';
import { JasperDataSourceComponent } from './datasource/jasper-datasource.component';
import { JasperIconComponent } from './icon/jasper-icon.component';
import { JasperInspectorComponent } from './inspector/jasper-inspector.component';
import { JasperPageSettingsComponent } from './page-settings/jasper-page-settings.component';
import { JasperPaletteComponent } from './palette/jasper-palette.component';
import { JasperSourceComponent } from './source/jasper-source.component';
import { JasperStylesComponent } from './styles/jasper-styles.component';
import { JasperToolbarComponent, type JasperViewMode } from './toolbar/jasper-toolbar.component';
import { JasperValidationComponent } from './validation/jasper-validation.component';
import { parseJrxml, serializeJrxml } from './jrxml';
import type { JasperReport } from './model';
import { EditorStore } from './state/editor-store';
import { validateReport } from './state/validation';

const DESKTOP_BREAKPOINT = '(min-width: 1100px)';

@Component({
  selector: 'lib-jasper-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    JasperPaletteComponent,
    JasperCanvasComponent,
    JasperContextMenuComponent,
    JasperInspectorComponent,
    JasperToolbarComponent,
    JasperDataSourceComponent,
    JasperPageSettingsComponent,
    JasperSourceComponent,
    JasperStylesComponent,
    JasperValidationComponent,
    JasperIconComponent,
  ],
  providers: [EditorStore],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-width: 0;
        font-family: -apple-system, system-ui, sans-serif;
        outline: none;
      }
      .je-topbar {
        display: flex;
        align-items: stretch;
        background: #fff;
        border-bottom: 1px solid #d8dbe3;
        min-width: 0;
      }
      .je-topbar lib-jasper-toolbar {
        flex: 1;
        min-width: 0;
        border-bottom: none;
      }
      .je-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        border: none;
        border-right: 1px solid #d8dbe3;
        padding: 0 12px;
        font-size: 16px;
        cursor: pointer;
        color: #555;
      }
      .je-toggle:last-child {
        border-right: none;
        border-left: 1px solid #d8dbe3;
      }
      .je-toggle:hover {
        background: #f3f5f9;
        color: #4a6cf7;
      }
      .je-toggle.active {
        color: #4a6cf7;
      }
      .je-body {
        flex: 1;
        display: flex;
        min-height: 0;
        min-width: 0;
        position: relative;
      }
      .je-palette {
        flex: 0 0 200px;
        min-width: 0;
        transition: flex-basis 0.18s ease, transform 0.18s ease;
      }
      .je-canvas {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        display: flex;
      }
      .je-canvas lib-jasper-canvas {
        flex: 1;
      }
      .je-right {
        flex: 0 0 340px;
        min-width: 0;
        display: flex;
        flex-direction: column;
        border-left: 1px solid #d8dbe3;
        background: #f7f8fb;
        transition: flex-basis 0.18s ease, transform 0.18s ease;
      }
      .je-body.palette-closed .je-palette {
        flex-basis: 0;
        overflow: hidden;
      }
      .je-body.inspector-closed .je-right {
        flex-basis: 0;
        overflow: hidden;
      }
      .je-tabs {
        display: flex;
        background: #fff;
        border-bottom: 1px solid #d8dbe3;
      }
      .je-tabs button {
        flex: 1;
        padding: 8px 12px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #555;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      }
      .je-tabs button.active {
        color: #4a6cf7;
        border-bottom-color: #4a6cf7;
      }
      .je-badge {
        display: inline-block;
        margin-left: 4px;
        padding: 0 5px;
        height: 14px;
        line-height: 14px;
        background: #b45309;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        border-radius: 7px;
        font-family: ui-monospace, Menlo, monospace;
        vertical-align: 1px;
      }
      .je-badge.err { background: #b00020; }
      .je-tab-body {
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }
      .je-tab-body > * {
        height: 100%;
      }
      .je-error {
        padding: 16px;
        color: #b00020;
        font-family: ui-monospace, Menlo, monospace;
        white-space: pre-wrap;
      }
      .je-source-wrap {
        flex: 1;
        min-height: 0;
        position: relative;
      }
      .je-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.25);
        z-index: 5;
      }

      /* Tablet: panels become slide-in drawers overlaying the canvas. */
      @media (max-width: 1099px) {
        .je-palette,
        .je-right {
          position: absolute;
          top: 0;
          bottom: 0;
          z-index: 10;
          flex-basis: auto;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
        }
        .je-palette {
          left: 0;
          width: 240px;
          transform: translateX(-100%);
        }
        .je-right {
          right: 0;
          width: 340px;
          transform: translateX(100%);
        }
        .je-body:not(.palette-closed) .je-palette {
          transform: translateX(0);
        }
        .je-body:not(.inspector-closed) .je-right {
          transform: translateX(0);
        }
      }

      /* Phone: drawers expand to full viewport width. */
      @media (max-width: 640px) {
        .je-palette {
          width: 80vw;
          max-width: 320px;
        }
        .je-right {
          width: 90vw;
          max-width: 360px;
        }
      }
    `,
  ],
  template: `
    @if (currentReport(); as report) {
      <div class="je-topbar">
        <button
          type="button"
          class="je-toggle"
          [class.active]="paletteOpen()"
          [attr.aria-label]="paletteOpen() ? 'Hide palette' : 'Show palette'"
          [attr.aria-pressed]="paletteOpen()"
          (click)="togglePalette()"
        ><lib-icon name="panel-left" [size]="16" /></button>
        <lib-jasper-toolbar
          [viewMode]="viewMode()"
          (viewModeChange)="setViewMode($event)"
        />
        <button
          type="button"
          class="je-toggle"
          [class.active]="inspectorOpen()"
          [attr.aria-label]="inspectorOpen() ? 'Hide inspector' : 'Show inspector'"
          [attr.aria-pressed]="inspectorOpen()"
          (click)="toggleInspector()"
        ><lib-icon name="panel-right" [size]="16" /></button>
      </div>
      @if (viewMode() === 'source') {
        <div class="je-source-wrap">
          <lib-jasper-source
            [value]="sourceText()"
            [error]="sourceError()"
            (valueChange)="onSourceChange($event)"
          />
        </div>
      } @else {
        <div
          class="je-body"
          [class.palette-closed]="!paletteOpen()"
          [class.inspector-closed]="!inspectorOpen()"
        >
          <lib-jasper-palette class="je-palette" />
          <div class="je-canvas">
            <lib-jasper-canvas [report]="report" [selectable]="true" />
          </div>
          <div class="je-right">
            <div class="je-tabs">
              <button
                type="button"
                [class.active]="activeTab() === 'properties'"
                (click)="activeTab.set('properties')"
              >
                Properties
              </button>
              <button
                type="button"
                [class.active]="activeTab() === 'data'"
                (click)="activeTab.set('data')"
              >
                Data
              </button>
              <button
                type="button"
                [class.active]="activeTab() === 'page'"
                (click)="activeTab.set('page')"
              >
                Page
              </button>
              <button
                type="button"
                [class.active]="activeTab() === 'styles'"
                (click)="activeTab.set('styles')"
              >
                Styles
              </button>
              <button
                type="button"
                [class.active]="activeTab() === 'validation'"
                (click)="activeTab.set('validation')"
                [title]="validationBadgeTitle()"
              >
                Check@if (validationBadge(); as b) { <span class="je-badge" [class.err]="b.severity === 'error'">{{ b.count }}</span> }
              </button>
            </div>
            <div class="je-tab-body">
              @switch (activeTab()) {
                @case ('properties') { <lib-jasper-inspector /> }
                @case ('data') { <lib-jasper-datasource /> }
                @case ('page') { <lib-jasper-page-settings /> }
                @case ('styles') { <lib-jasper-styles /> }
                @case ('validation') { <lib-jasper-validation /> }
              }
            </div>
          </div>
          @if (showBackdrop()) {
            <div class="je-backdrop" (click)="closeDrawers()"></div>
          }
        </div>
      }
    } @else if (error()) {
      <div class="je-error">JRXML parse error: {{ error() }}</div>
    }
    @if (store.contextMenu(); as cm) {
      <lib-jasper-context-menu [anchor]="cm" />
    }
  `,
  host: { tabindex: '0' },
})
export class JasperEditorComponent {
  readonly jrxml = input<string | null>(null);
  readonly report = input<JasperReport | null>(null);

  readonly reportChange = output<JasperReport>();
  readonly jrxmlChange = output<string>();

  protected readonly store = inject(EditorStore);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly activeTab = signal<'properties' | 'data' | 'page' | 'styles' | 'validation'>('properties');
  protected readonly viewMode = signal<JasperViewMode>('design');
  protected readonly sourceText = signal<string>('');
  protected readonly sourceError = signal<string | null>(null);
  /** True while we're updating sourceText from the model — used to skip the
   *  reverse parse effect that would otherwise echo the same text back. */
  private suppressSourceParse = false;

  /** Tracks the XML we last emitted via jrxmlChange. The parent typically
   *  feeds it straight back via two-way binding; without this guard the
   *  resulting setReport call would wipe the undo stack on every mutation. */
  private lastEmittedXml: string | null = null;

  /** True when viewport is wide enough for inline panels. */
  private readonly isDesktop = signal<boolean>(this.detectDesktop());

  protected readonly paletteOpen = signal<boolean>(this.isDesktop());
  protected readonly inspectorOpen = signal<boolean>(this.isDesktop());

  protected readonly showBackdrop = computed<boolean>(
    () => !this.isDesktop() && (this.paletteOpen() || this.inspectorOpen()),
  );

  protected readonly currentReport = computed<JasperReport | null>(() => this.store.report());

  /** Worst-severity badge for the validation tab. Re-runs the validator on
   *  every model change — cheap relative to a render frame. */
  protected readonly validationBadge = computed<{ severity: 'error' | 'warning'; count: number } | null>(() => {
    const r = this.currentReport();
    if (!r) return null;
    const issues = validateReport(r);
    const errors = issues.filter((i) => i.severity === 'error').length;
    if (errors > 0) return { severity: 'error', count: errors };
    if (issues.length > 0) return { severity: 'warning', count: issues.length };
    return null;
  });

  protected readonly validationBadgeTitle = computed<string>(() => {
    const b = this.validationBadge();
    if (!b) return 'No validation problems';
    return b.severity === 'error'
      ? `${b.count} validation error${b.count === 1 ? '' : 's'}`
      : `${b.count} validation warning${b.count === 1 ? '' : 's'}`;
  });

  protected readonly error = computed<string | null>(() => {
    const xml = this.jrxml();
    if (!xml || this.report()) return null;
    try {
      parseJrxml(xml);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  });

  constructor() {
    effect(() => {
      const r = this.report();
      if (r) {
        this.store.setReport(r);
        return;
      }
      const xml = this.jrxml();
      if (!xml) {
        this.store.setReport(null);
        return;
      }
      // Skip the round-trip echo: if the input matches XML we just emitted,
      // the store is already in sync — re-running setReport would wipe undo.
      if (xml === this.lastEmittedXml) return;
      try {
        this.store.setReport(parseJrxml(xml));
      } catch {
        this.store.setReport(null);
      }
    });

    let initial = true;
    effect(() => {
      const r = this.store.report();
      if (initial) {
        initial = false;
        return;
      }
      if (!r) return;
      const xml = serializeJrxml(r);
      this.lastEmittedXml = xml;
      this.reportChange.emit(r);
      this.jrxmlChange.emit(xml);
    });

    // While in source mode, parse text on every keystroke. If parsing fails,
    // surface the error inline; if it succeeds, push the new model into the
    // store so design mode reflects the latest edits when the user switches.
    effect(() => {
      if (this.viewMode() !== 'source') return;
      if (this.suppressSourceParse) return;
      const text = this.sourceText();
      if (!text) {
        this.sourceError.set(null);
        return;
      }
      try {
        const model = parseJrxml(text);
        this.sourceError.set(null);
        // Avoid bumping store on identical content.
        const current = this.store.report();
        if (current && serializeJrxml(current) === text) return;
        this.store.setReport(model);
      } catch (e) {
        this.sourceError.set(e instanceof Error ? e.message : String(e));
      }
    });

    if (this.isBrowser) {
      const mql = window.matchMedia(DESKTOP_BREAKPOINT);
      const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
        const desktop = e.matches;
        this.isDesktop.set(desktop);
        // When transitioning between layouts, default both panels to the
        // sensible state for the new viewport.
        this.paletteOpen.set(desktop);
        this.inspectorOpen.set(desktop);
      };
      mql.addEventListener('change', onChange);
    }
  }

  protected setViewMode(mode: JasperViewMode): void {
    if (mode === this.viewMode()) return;
    if (mode === 'source') {
      const r = this.store.report();
      if (r) {
        this.suppressSourceParse = true;
        this.sourceText.set(serializeJrxml(r));
        this.sourceError.set(null);
        // Allow the parse effect on subsequent keystrokes.
        queueMicrotask(() => (this.suppressSourceParse = false));
      }
    }
    this.viewMode.set(mode);
  }

  protected onSourceChange(text: string): void {
    this.sourceText.set(text);
  }

  protected togglePalette(): void {
    this.paletteOpen.update((v) => !v);
    // On mobile, opening one drawer closes the other to avoid overlap.
    if (!this.isDesktop() && this.paletteOpen()) this.inspectorOpen.set(false);
  }

  protected toggleInspector(): void {
    this.inspectorOpen.update((v) => !v);
    if (!this.isDesktop() && this.inspectorOpen()) this.paletteOpen.set(false);
  }

  protected closeDrawers(): void {
    if (this.isDesktop()) return;
    this.paletteOpen.set(false);
    this.inspectorOpen.set(false);
  }

  private detectDesktop(): boolean {
    if (!this.isBrowser) return true;
    return window.matchMedia(DESKTOP_BREAKPOINT).matches;
  }

  /** Open transaction wrapping a held-key nudge sequence. Idle for ~500ms
   *  collapses every nudge into a single undo entry; the next key after the
   *  pause starts a fresh entry. */
  private nudgeTxOpen = false;
  private nudgeIdleTimer: ReturnType<typeof setTimeout> | null = null;

  private nudge(dx: number, dy: number): void {
    const sels = this.store.selections();
    if (sels.length === 0) return;
    if (!this.nudgeTxOpen) {
      this.store.beginTransaction();
      this.nudgeTxOpen = true;
    }
    if (this.nudgeIdleTimer) clearTimeout(this.nudgeIdleTimer);
    this.nudgeIdleTimer = setTimeout(() => this.commitNudge(), 500);
    this.store.updateMany(sels, (el) => {
      if (el.kind === 'elementGroup') return el;
      return {
        ...el,
        x: Math.max(0, el.x + dx),
        y: Math.max(0, el.y + dy),
      };
    });
  }

  private commitNudge(): void {
    if (this.nudgeIdleTimer) {
      clearTimeout(this.nudgeIdleTimer);
      this.nudgeIdleTimer = null;
    }
    if (this.nudgeTxOpen) {
      this.store.commitTransaction();
      this.nudgeTxOpen = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && isEditable(target)) return;

    const meta = event.metaKey || event.ctrlKey;

    if (event.key === 'Escape') {
      if (this.store.contextMenu()) {
        event.preventDefault();
        this.store.closeContextMenu();
      }
      return;
    }
    if (meta && !event.shiftKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      this.commitNudge();
      this.store.undo();
      return;
    }
    if (meta && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
      event.preventDefault();
      this.commitNudge();
      this.store.redo();
      return;
    }
    if (meta && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      this.store.copySelected();
      return;
    }
    if (meta && event.key.toLowerCase() === 'x') {
      event.preventDefault();
      this.commitNudge();
      this.store.cutSelected();
      return;
    }
    if (meta && event.key.toLowerCase() === 'v') {
      event.preventDefault();
      this.commitNudge();
      this.store.paste();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.commitNudge();
      this.store.deleteSelected();
      return;
    }
    if (meta && event.key === ']') {
      event.preventDefault();
      this.commitNudge();
      if (event.shiftKey) this.store.bringToFront();
      else this.store.bringForward();
      return;
    }
    if (meta && event.key === '[') {
      event.preventDefault();
      this.commitNudge();
      if (event.shiftKey) this.store.sendToBack();
      else this.store.sendBackward();
      return;
    }
    if (meta && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      this.commitNudge();
      if (event.shiftKey) this.store.ungroupSelected();
      else this.store.groupSelected();
      return;
    }
    if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown'
    ) {
      if (this.store.selectedElement() === null) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      this.nudge(dx, dy);
      return;
    }
  }
}

function isEditable(el: HTMLElement): boolean {
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
