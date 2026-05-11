import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import type { Band, BandSection } from '../model/band';
import type { AnyElement, TextFieldElement } from '../model/element';
import { PALETTE_DRAG_MIME } from '../palette/jasper-palette.component';
import { DATA_BINDING_DRAG_MIME, type DataBindingDragPayload } from '../datasource/jasper-datasource.component';
import { createDefaultElement, type CreatableKind } from '../state/element-factory';
import { uuid } from '../state/uuid';
import { EditorStore } from '../state/editor-store';
import { pathsEqual, type ElementPath } from '../state/path';
import { DEFAULT_GRID, snap } from '../state/snap';
import { JasperElementComponent } from './jasper-element.component';
import { JasperResizeHandlesComponent } from './jasper-resize-handles.component';

interface MarqueeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

@Component({
  selector: 'lib-jasper-band',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JasperElementComponent, JasperResizeHandlesComponent],
  styles: [
    `
      :host {
        display: block;
        position: relative;
        margin-bottom: 6px;
      }
      .jb-header {
        height: 14px;
        padding: 0 6px;
        font-size: 9px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        line-height: 14px;
        background: #eef0f4;
        border: 1px solid #d8dbe3;
        border-bottom: none;
        font-family: ui-monospace, Menlo, monospace;
        user-select: none;
      }
      .jb-surface {
        position: relative;
        background: #fff;
        background-image:
          linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
        background-size: 10px 10px;
        outline: 1px solid #d3d7e0;
      }
      .jb-surface.drag-over {
        outline: 2px solid #4a6cf7;
        background-color: #f5f8ff;
      }
      .jb-resize {
        height: 6px;
        margin-top: 1px;
        cursor: row-resize;
        background: transparent;
        transition: background 0.12s;
      }
      .jb-resize:hover,
      .jb-resize.dragging {
        background: #4a6cf7;
      }
      .jb-marquee {
        position: absolute;
        border: 1px dashed #4a6cf7;
        background: rgba(74, 108, 247, 0.08);
        pointer-events: none;
        box-sizing: border-box;
      }
      .jb-guide-v,
      .jb-guide-h {
        position: absolute;
        background: #ff3b30;
        pointer-events: none;
        z-index: 5;
      }
      .jb-guide-v { top: 0; bottom: 0; width: 1px; }
      .jb-guide-h { left: 0; right: 0; height: 1px; }
    `,
  ],
  template: `
    <div class="jb-header">{{ label() }}</div>
    <div
      #surface
      class="jb-surface"
      [class.drag-over]="dragOver"
      [style.width.px]="width()"
      [style.height.px]="band().height"
      (pointerdown)="onSurfacePointerDown($event, surface)"
      (contextmenu)="onSurfaceContextMenu($event, surface)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event, surface)"
    >
      @for (el of band().elements; track $index) {
        <lib-jasper-element [element]="el" [path]="elementPath($index)" />
      }
      @if (selectedChild(); as sel) {
        <lib-jasper-resize-handles
          [element]="sel"
          [style.left.px]="sel.x"
          [style.top.px]="sel.y"
          [style.width.px]="sel.width"
          [style.height.px]="sel.height"
        />
      }
      @if (marqueeRect(); as m) {
        <div
          class="jb-marquee"
          [style.left.px]="m.x"
          [style.top.px]="m.y"
          [style.width.px]="m.w"
          [style.height.px]="m.h"
        ></div>
      }
      @if (activeGuides(); as g) {
        @for (x of g.vertical; track x) {
          <div class="jb-guide-v" [style.left.px]="x"></div>
        }
        @for (y of g.horizontal; track y) {
          <div class="jb-guide-h" [style.top.px]="y"></div>
        }
      }
    </div>
    <div
      class="jb-resize"
      [class.dragging]="resizing"
      [style.width.px]="width()"
      (pointerdown)="onResizeStart($event)"
      title="Drag to resize {{ section() }} band"
    ></div>
  `,
})
export class JasperBandComponent {
  readonly band = input.required<Band>();
  readonly width = input.required<number>();
  readonly section = input.required<BandSection>();
  readonly index = input<number | null>(null);
  readonly selectable = input<boolean>(false);
  /** Required for group bands; ignored otherwise. */
  readonly groupName = input<string | undefined>(undefined);

  private readonly store = inject(EditorStore, { optional: true });

  protected dragOver = false;

  /** The single element selected within this band, if any. Resize handles only
   *  show for single selections — multi-select drags use no handles. */
  protected readonly selectedChild = computed<Exclude<AnyElement, { kind: 'elementGroup' }> | null>(() => {
    if (!this.selectable() || !this.store) return null;
    if (this.store.hasMultiSelection()) return null;
    const sel = this.store.selection();
    if (!sel) return null;
    if (sel.section !== this.section()) return null;
    if (sel.bandIndex !== (this.index() ?? 0)) return null;
    if (sel.indices.length !== 1) return null;
    // Don't render band-level handles when the selection targets a table cell child.
    if (sel.tableCell) return null;
    const target = this.band().elements[sel.indices[0]!];
    if (!target || target.kind === 'elementGroup') return null;
    return target;
  });

  protected label(): string {
    const idx = this.index();
    const gn = this.groupName();
    const base = gn ? `${this.section()} (${gn})` : this.section();
    return idx === null ? base : `${base} ${idx + 1}`;
  }

  /** Drag guides scoped to this band (or null when nothing relevant). */
  protected readonly activeGuides = computed(() => {
    if (!this.store) return null;
    const g = this.store.dragGuides();
    if (!g) return null;
    if (g.section !== this.section()) return null;
    if (g.bandIndex !== (this.index() ?? 0)) return null;
    if ((g.groupName ?? '') !== (this.groupName() ?? '')) return null;
    return g;
  });

  protected elementPath(elementIndex: number): ElementPath | null {
    if (!this.selectable()) return null;
    return {
      section: this.section(),
      bandIndex: this.index() ?? 0,
      groupName: this.groupName(),
      indices: [elementIndex],
    };
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.selectable() || !this.store) return;
    const types = event.dataTransfer?.types;
    if (!types) return;
    if (!types.includes(PALETTE_DRAG_MIME) && !types.includes(DATA_BINDING_DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
    if (!this.dragOver) this.dragOver = true;
  }

  protected onDragLeave(): void {
    this.dragOver = false;
  }

  protected onDrop(event: DragEvent, surface: HTMLElement): void {
    if (!this.selectable() || !this.store) return;
    const dt = event.dataTransfer;
    if (!dt) return;

    const rect = surface.getBoundingClientRect();
    const x = Math.max(0, Math.round(event.clientX - rect.left));
    const y = Math.max(0, Math.round(event.clientY - rect.top));

    // Data-binding drop (field/parameter/variable from the Data tab) creates a
    // textField with the appropriate `$F{}` / `$P{}` / `$V{}` expression.
    const bindingRaw = dt.getData(DATA_BINDING_DRAG_MIME);
    if (bindingRaw) {
      event.preventDefault();
      this.dragOver = false;
      try {
        const payload = JSON.parse(bindingRaw) as DataBindingDragPayload;
        const expression = `\$${payload.kind}{${payload.name}}`;
        const tf: TextFieldElement = {
          x,
          y,
          width: 100,
          height: 20,
          uuid: uuid(),
          kind: 'textField',
          expression,
        };
        this.store.addElement(this.section(), this.index() ?? 0, tf, this.groupName());
      } catch {
        // ignore malformed payload
      }
      return;
    }

    const kind = dt.getData(PALETTE_DRAG_MIME) as CreatableKind | '';
    if (!kind) return;
    event.preventDefault();
    this.dragOver = false;
    const element = createDefaultElement(kind, x, y);
    this.store.addElement(this.section(), this.index() ?? 0, element, this.groupName());
  }

  // ---------- Marquee selection ----------------------------------------------

  protected readonly marqueeRect = signal<MarqueeRect | null>(null);

  private marqueeState: {
    startClientX: number;
    startClientY: number;
    surfaceLeft: number;
    surfaceTop: number;
    pointerId: number;
    target: HTMLElement;
    additive: boolean;
    active: boolean;
  } | null = null;

  protected onSurfaceContextMenu(event: MouseEvent, surface: HTMLElement): void {
    if (!this.selectable() || !this.store) return;
    if (event.target !== surface) return;
    event.preventDefault();
    this.store.openContextMenu(event.clientX, event.clientY);
  }

  protected onSurfacePointerDown(event: PointerEvent, surface: HTMLElement): void {
    if (event.button !== 0) return;
    if (!this.selectable() || !this.store) return;
    // Only trigger on the bare surface — clicks on child elements bubble up.
    if (event.target !== surface) return;
    event.stopPropagation();

    const rect = surface.getBoundingClientRect();
    this.marqueeState = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      surfaceLeft: rect.left,
      surfaceTop: rect.top,
      pointerId: event.pointerId,
      target: surface,
      additive: event.shiftKey || event.metaKey || event.ctrlKey,
      active: false,
    };
    surface.addEventListener('pointermove', this.onSurfacePointerMove);
    surface.addEventListener('pointerup', this.onSurfacePointerUp);
    surface.addEventListener('pointercancel', this.onSurfacePointerUp);
    try {
      surface.setPointerCapture(event.pointerId);
    } catch {
      // synthetic events in tests
    }
  }

  private readonly onSurfacePointerMove = (event: PointerEvent): void => {
    const s = this.marqueeState;
    if (!s) return;
    const dx = event.clientX - s.startClientX;
    const dy = event.clientY - s.startClientY;
    if (!s.active && Math.hypot(dx, dy) < 3) return;
    s.active = true;
    const x = Math.min(s.startClientX, event.clientX) - s.surfaceLeft;
    const y = Math.min(s.startClientY, event.clientY) - s.surfaceTop;
    const w = Math.abs(event.clientX - s.startClientX);
    const h = Math.abs(event.clientY - s.startClientY);
    this.marqueeRect.set({ x, y, w, h });
  };

  private readonly onSurfacePointerUp = (event: PointerEvent): void => {
    const s = this.marqueeState;
    this.marqueeState = null;
    const rect = this.marqueeRect();
    this.marqueeRect.set(null);
    if (!s || !this.store) return;
    try {
      s.target.releasePointerCapture(s.pointerId);
    } catch {
      // ignore
    }
    s.target.removeEventListener('pointermove', this.onSurfacePointerMove);
    s.target.removeEventListener('pointerup', this.onSurfacePointerUp);
    s.target.removeEventListener('pointercancel', this.onSurfacePointerUp);

    if (!s.active || !rect) {
      // Plain click on background — clear selection unless the user was holding
      // a modifier (in which case do nothing).
      if (!s.additive) this.store.select(null);
      return;
    }

    // Find every top-level element in this band whose bounding box intersects
    // the marquee rect. ElementGroups have no geometry and are skipped.
    const hits: ElementPath[] = [];
    const elements = this.band().elements;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]!;
      if (el.kind === 'elementGroup') continue;
      if (
        el.x < rect.x + rect.w &&
        el.x + el.width > rect.x &&
        el.y < rect.y + rect.h &&
        el.y + el.height > rect.y
      ) {
        const p = this.elementPath(i);
        if (p) hits.push(p);
      }
    }

    if (s.additive) {
      const merged = [...this.store.selections()];
      for (const p of hits) {
        if (!merged.some((q) => pathsEqual(p, q))) merged.push(p);
      }
      this.store.setSelections(merged);
    } else {
      this.store.setSelections(hits);
    }
  };

  // ---------- Band height resize ---------------------------------------------

  protected resizing = false;
  private resizeState: {
    startY: number;
    startHeight: number;
    pointerId: number;
    target: HTMLElement;
  } | null = null;

  protected onResizeStart(event: PointerEvent): void {
    if (event.button !== 0 || !this.store) return;
    event.preventDefault();
    event.stopPropagation();
    this.resizing = true;
    const target = event.currentTarget as HTMLElement;
    this.resizeState = {
      startY: event.clientY,
      startHeight: this.band().height,
      pointerId: event.pointerId,
      target,
    };
    target.addEventListener('pointermove', this.onResizeMove);
    target.addEventListener('pointerup', this.onResizeEnd);
    target.addEventListener('pointercancel', this.onResizeEnd);
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // ignore in tests with synthetic events
    }
    this.store.beginTransaction();
  }

  private readonly onResizeMove = (event: PointerEvent): void => {
    const s = this.resizeState;
    if (!s || !this.store) return;
    const dy = event.clientY - s.startY;
    const next = Math.max(0, snap(s.startHeight + dy, DEFAULT_GRID));
    const section = this.section();
    const bandIndex = this.index() ?? 0;
    this.store.updateBand(section, bandIndex, (b) => ({ ...b, height: next }), this.groupName());
  };

  private readonly onResizeEnd = (event: PointerEvent): void => {
    const s = this.resizeState;
    this.resizeState = null;
    this.resizing = false;
    if (!s) return;
    try {
      s.target.releasePointerCapture(s.pointerId);
    } catch {
      // ignore
    }
    s.target.removeEventListener('pointermove', this.onResizeMove);
    s.target.removeEventListener('pointerup', this.onResizeEnd);
    s.target.removeEventListener('pointercancel', this.onResizeEnd);
    this.store?.commitTransaction();
  };
}
