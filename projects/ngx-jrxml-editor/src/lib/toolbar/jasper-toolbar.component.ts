import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import type { ElementCommon } from '../model/element';
import { JasperIconComponent } from '../icon/jasper-icon.component';
import {
  type AlignMode,
  computeAlignment,
  computeDistribution,
  type DistributeMode,
} from '../state/alignment';
import { EditorStore } from '../state/editor-store';
import { type ElementPath, getElementAt } from '../state/path';

export type JasperViewMode = 'design' | 'source';

@Component({
  selector: 'lib-jasper-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JasperIconComponent],
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: 4px;
        background: #fff;
        border-bottom: 1px solid #d8dbe3;
        padding: 6px 12px;
        font-family: -apple-system, system-ui, sans-serif;
        font-size: 12px;
        overflow-x: auto;
        scrollbar-width: thin;
      }
      button {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        background: #fff;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        font-size: 12px;
        cursor: pointer;
        color: #1a1d27;
        white-space: nowrap;
        flex-shrink: 0;
      }
      button:hover:not(:disabled) {
        background: #f3f5f9;
        border-color: #4a6cf7;
        color: #4a6cf7;
      }
      button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      button.icon {
        padding: 4px 6px;
      }
      .sep {
        width: 1px;
        height: 20px;
        background: #e1e4eb;
        margin: 0 4px;
      }
      .zoom {
        display: inline-flex;
        align-items: center;
        gap: 0;
      }
      .zoom button {
        padding: 4px 8px;
        min-width: 26px;
        justify-content: center;
        font-weight: 600;
      }
      .zoom .level {
        padding: 4px 8px;
        background: #fff;
        border: 1px solid #cfd3dc;
        border-left: none;
        border-right: none;
        font-variant-numeric: tabular-nums;
        font-size: 12px;
        color: #1a1d27;
        cursor: pointer;
        min-width: 48px;
        text-align: center;
      }
      .zoom .level:hover {
        color: #4a6cf7;
      }
      .zoom button.zoom-out {
        border-radius: 3px 0 0 3px;
      }
      .zoom button.zoom-in {
        border-radius: 0 3px 3px 0;
      }
      .vmode {
        display: inline-flex;
        align-items: center;
      }
      .vmode button {
        padding: 4px 12px;
        font-weight: 600;
      }
      .vmode button:first-of-type {
        border-radius: 3px 0 0 3px;
      }
      .vmode button:last-of-type {
        border-radius: 0 3px 3px 0;
        border-left: none;
      }
      .vmode button.active {
        background: #4a6cf7;
        color: #fff;
        border-color: #4a6cf7;
      }
    `,
  ],
  template: `
    <button type="button" [disabled]="!store.canUndo()" (click)="store.undo()" title="Undo (⌘Z)">
      <lib-icon name="undo" [size]="14" /> Undo
    </button>
    <button type="button" [disabled]="!store.canRedo()" (click)="store.redo()" title="Redo (⇧⌘Z)">
      <lib-icon name="redo" [size]="14" /> Redo
    </button>
    <span class="sep"></span>
    <button type="button" [disabled]="!hasSelection()" (click)="store.copySelected()" title="Copy (⌘C)">
      <lib-icon name="copy" [size]="14" /> Copy
    </button>
    <button type="button" [disabled]="!store.canPaste()" (click)="store.paste()" title="Paste (⌘V)">
      <lib-icon name="paste" [size]="14" /> Paste
    </button>
    <button type="button" [disabled]="!hasSelection()" (click)="store.deleteSelected()" title="Delete (⌫)">
      <lib-icon name="trash" [size]="14" /> Delete
    </button>
    <span class="sep"></span>
    <button type="button" class="icon" [disabled]="!canAlign()" (click)="align('left')" title="Align left">
      <lib-icon name="align-left" [size]="14" />
    </button>
    <button type="button" class="icon" [disabled]="!canAlign()" (click)="align('h-center')" title="Align horizontal centers">
      <lib-icon name="align-h-center" [size]="14" />
    </button>
    <button type="button" class="icon" [disabled]="!canAlign()" (click)="align('right')" title="Align right">
      <lib-icon name="align-right" [size]="14" />
    </button>
    <button type="button" class="icon" [disabled]="!canAlign()" (click)="align('top')" title="Align top">
      <lib-icon name="align-top" [size]="14" />
    </button>
    <button type="button" class="icon" [disabled]="!canAlign()" (click)="align('v-center')" title="Align vertical centers">
      <lib-icon name="align-v-center" [size]="14" />
    </button>
    <button type="button" class="icon" [disabled]="!canAlign()" (click)="align('bottom')" title="Align bottom">
      <lib-icon name="align-bottom" [size]="14" />
    </button>
    <span class="sep"></span>
    <button type="button" class="icon" [disabled]="!canDistribute()" (click)="distribute('horizontal')" title="Distribute horizontally">
      <lib-icon name="distribute-h" [size]="14" />
    </button>
    <button type="button" class="icon" [disabled]="!canDistribute()" (click)="distribute('vertical')" title="Distribute vertically">
      <lib-icon name="distribute-v" [size]="14" />
    </button>
    <span class="sep"></span>
    <button type="button" class="icon" [disabled]="!store.canBringForward()" (click)="store.bringToFront()" title="Bring to front (⇧⌘])">
      <lib-icon name="bring-to-front" [size]="14" />
    </button>
    <button type="button" class="icon" [disabled]="!store.canBringForward()" (click)="store.bringForward()" title="Bring forward (⌘])">
      <lib-icon name="bring-forward" [size]="14" />
    </button>
    <button type="button" class="icon" [disabled]="!store.canSendBackward()" (click)="store.sendBackward()" title="Send backward (⌘[)">
      <lib-icon name="send-backward" [size]="14" />
    </button>
    <button type="button" class="icon" [disabled]="!store.canSendBackward()" (click)="store.sendToBack()" title="Send to back (⇧⌘[)">
      <lib-icon name="send-to-back" [size]="14" />
    </button>
    <span class="sep"></span>
    <button type="button" class="icon" [disabled]="!store.canGroupSelection()" (click)="store.groupSelected()" title="Group selected (⌘G)">
      <lib-icon name="group" [size]="14" />
    </button>
    <button type="button" class="icon" [disabled]="!store.canUngroupSelection()" (click)="store.ungroupSelected()" title="Ungroup (⇧⌘G)">
      <lib-icon name="frame" [size]="14" />
    </button>
    <span class="sep"></span>
    <span class="zoom">
      <button type="button" class="zoom-out" (click)="store.zoomOut()" title="Zoom out">
        <lib-icon name="zoom-out" [size]="14" />
      </button>
      <button
        type="button"
        class="level"
        (click)="store.resetZoom()"
        title="Reset zoom to 100%"
      >{{ zoomPercent() }}%</button>
      <button type="button" class="zoom-in" (click)="store.zoomIn()" title="Zoom in">
        <lib-icon name="zoom-in" [size]="14" />
      </button>
    </span>
    <span class="sep"></span>
    <span class="vmode">
      <button
        type="button"
        [class.active]="viewMode() === 'design'"
        (click)="viewModeChange.emit('design')"
        title="Visual designer"
      >Design</button>
      <button
        type="button"
        [class.active]="viewMode() === 'source'"
        (click)="viewModeChange.emit('source')"
        title="Edit JRXML source"
      >Source</button>
    </span>
  `,
})
export class JasperToolbarComponent {
  protected readonly store = inject(EditorStore);
  protected readonly hasSelection = computed(() => this.store.selectedElement() !== null);
  protected readonly zoomPercent = computed(() => Math.round(this.store.zoom() * 100));

  /** Alignment requires two or more positionable selected elements. */
  protected readonly canAlign = computed(() => this.positionableSelectedCount() >= 2);
  protected readonly canDistribute = computed(() => this.positionableSelectedCount() >= 3);

  private readonly positionableSelectedCount = computed(
    () => this.store.selectedElements().filter((el) => el.kind !== 'elementGroup').length,
  );

  readonly viewMode = input<JasperViewMode>('design');
  readonly viewModeChange = output<JasperViewMode>();

  protected align(mode: AlignMode): void {
    const items = this.collectPositionableSelections();
    if (items.length < 2) return;
    const patches = computeAlignment(items, mode);
    this.applyPatches(patches);
  }

  protected distribute(mode: DistributeMode): void {
    const items = this.collectPositionableSelections();
    if (items.length < 3) return;
    const patches = computeDistribution(items, mode);
    this.applyPatches(patches);
  }

  private collectPositionableSelections(): { path: ElementPath; el: ElementCommon }[] {
    const r = this.store.report();
    if (!r) return [];
    const out: { path: ElementPath; el: ElementCommon }[] = [];
    for (const p of this.store.selections()) {
      const el = getElementAt(r, p);
      if (!el || el.kind === 'elementGroup') continue;
      out.push({ path: p, el });
    }
    return out;
  }

  private applyPatches(
    patches: { path: ElementPath; x?: number; y?: number }[],
  ): void {
    if (patches.length === 0) return;
    const byPath = new Map(patches.map((p) => [p.path, p]));
    this.store.updateMany(
      patches.map((p) => p.path),
      (el, path) => {
        const patch = byPath.get(path);
        if (!patch || el.kind === 'elementGroup') return el;
        return {
          ...el,
          x: patch.x ?? el.x,
          y: patch.y ?? el.y,
        };
      },
    );
  }
}
