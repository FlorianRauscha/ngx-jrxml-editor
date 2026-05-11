import { Directive, computed, inject, input } from '@angular/core';

import type { AnyElement, ElementCommon } from '../model/element';
import type { Band } from '../model/band';
import { EditorStore } from '../state/editor-store';
import type { ElementPath } from '../state/path';
import { DEFAULT_GRID, snap } from '../state/snap';
import { getElementAt } from '../state/path';
import { isHidden, isLocked } from '../state/editor-flags';

/**
 * Per-element interaction host directive.
 *
 * Applied as `[libElementInteraction]` on the rendered element of any per-kind
 * component. Owns:
 *   - the `.selected` host class
 *   - click / shift-click selection (replace vs toggle)
 *   - pointerdown drag-to-move that moves every currently-selected element by
 *     the same delta in a single undo transaction
 *
 * Per-kind components remain free of selection/drag plumbing — they only
 * declare their template + per-kind style computation.
 */
@Directive({
  selector: '[libElementInteraction]',
  standalone: true,
  host: {
    '[class.selectable]': '!!path() && !locked()',
    '[class.selected]': 'selected()',
    '[class.je-locked]': 'locked()',
    '[class.je-hidden]': 'hidden()',
    '(click)': 'onClick($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class ElementInteractionDirective {
  /** The element backing this rendered node. */
  readonly element = input.required<AnyElement>({ alias: 'libElementInteraction' });

  /** The path that identifies this element within the report. `null` means
   *  read-only (no selection / drag wired). */
  readonly path = input<ElementPath | null>(null, { alias: 'libElementPath' });

  private readonly store = inject(EditorStore, { optional: true });

  readonly selected = computed<boolean>(() => {
    const p = this.path();
    if (!p || !this.store) return false;
    return this.store.isSelected(p);
  });

  readonly locked = computed<boolean>(() => isLocked(this.element()));
  readonly hidden = computed<boolean>(() => isHidden(this.element()));

  protected onClick(event: MouseEvent): void {
    const p = this.path();
    if (!p || !this.store || this.locked()) return;
    event.stopPropagation();
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      this.store.toggleSelection(p);
    } else {
      this.store.select(p);
    }
  }

  protected onContextMenu(event: MouseEvent): void {
    const p = this.path();
    if (!p || !this.store || this.locked()) return;
    event.preventDefault();
    event.stopPropagation();
    if (!this.store.isSelected(p)) this.store.select(p);
    this.store.openContextMenu(event.clientX, event.clientY);
  }

  private dragState: {
    startX: number;
    startY: number;
    /** [path, originalX, originalY] for every selected element at drag start. */
    items: { path: ElementPath; origX: number; origY: number }[];
    active: boolean;
    pointerId: number;
    target: HTMLElement;
  } | null = null;

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const p = this.path();
    if (!p || !this.store || this.locked()) return;
    // Only top-level moves; child elements inside frames need their own logic.
    if (event.target !== event.currentTarget) return;

    // Modifier-clicks toggle membership without starting a drag — let the
    // subsequent click event do the toggle so we don't double-fire.
    if (event.shiftKey || event.metaKey || event.ctrlKey) return;

    event.stopPropagation();

    // If this element isn't already part of the current multi-selection,
    // replace selection with just it. Otherwise keep the multi-selection so
    // the upcoming drag affects every selected element.
    const wasMember = this.store.isSelected(p);
    if (!wasMember) this.store.select(p);

    const el = this.element();
    if (el.kind === 'elementGroup') return;

    const report = this.store.report();
    if (!report) return;

    // Snapshot every selected element's original (x, y) so each move event
    // can compute "orig + delta" without mutation drift.
    const paths = wasMember ? this.store.selections() : [p];
    const items: { path: ElementPath; origX: number; origY: number }[] = [];
    for (const sp of paths) {
      const target = getElementAt(report, sp);
      if (!target || target.kind === 'elementGroup') continue;
      items.push({ path: sp, origX: target.x, origY: target.y });
    }
    if (items.length === 0) return;

    const target = event.currentTarget as HTMLElement;
    this.dragState = {
      startX: event.clientX,
      startY: event.clientY,
      items,
      active: false,
      pointerId: event.pointerId,
      target,
    };
    target.addEventListener('pointermove', this.onPointerMove);
    target.addEventListener('pointerup', this.onPointerUp);
    target.addEventListener('pointercancel', this.onPointerUp);
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // setPointerCapture can fail with synthetic events in tests.
    }
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const state = this.dragState;
    if (!state || !this.store) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.active && Math.hypot(dx, dy) < 3) return;
    if (!state.active) {
      state.active = true;
      this.store.beginTransaction();
    }
    const items = state.items;
    this.store.updateMany(
      items.map((i) => i.path),
      (el, p) => {
        const item = items.find((i) => i.path === p)!;
        return {
          ...el,
          x: Math.max(0, snap(item.origX + dx, DEFAULT_GRID)),
          y: Math.max(0, snap(item.origY + dy, DEFAULT_GRID)),
        };
      },
    );
    this.refreshGuides();
  };

  /** Snapshot the dragged element's bbox and compare its edges/centers against
   *  every other top-level sibling in the same band. Edges within 1px get a
   *  guide line. Drag is the only point at which we touch the dragGuides
   *  signal — `onPointerUp` clears it. */
  private refreshGuides(): void {
    if (!this.store) return;
    const sel = this.store.selection();
    const report = this.store.report();
    if (!sel || !report) return;
    if (sel.indices.length !== 1 || sel.tableCell) {
      this.store.setDragGuides(null);
      return;
    }
    const dragged = getElementAt(report, sel) as ElementCommon | undefined;
    if (!dragged || !('x' in dragged)) {
      this.store.setDragGuides(null);
      return;
    }
    let band: Band | undefined;
    if (sel.section === 'detail') {
      band = report.sections.detail?.[sel.bandIndex];
    } else if (sel.section === 'groupHeader' || sel.section === 'groupFooter') {
      const group = report.groups?.find((g) => g.name === sel.groupName);
      const list = sel.section === 'groupHeader' ? group?.groupHeader : group?.groupFooter;
      band = list?.[sel.bandIndex];
    } else {
      band = (report.sections as Record<string, Band | undefined>)[sel.section];
    }
    if (!band) {
      this.store.setDragGuides(null);
      return;
    }
    const draggedIdx = sel.indices[0]!;
    const verticalSet = new Set<number>();
    const horizontalSet = new Set<number>();
    const dxLeft = dragged.x;
    const dxRight = dragged.x + dragged.width;
    const dxCenter = dragged.x + dragged.width / 2;
    const dyTop = dragged.y;
    const dyBottom = dragged.y + dragged.height;
    const dyMiddle = dragged.y + dragged.height / 2;
    for (let i = 0; i < band.elements.length; i++) {
      if (i === draggedIdx) continue;
      const sib = band.elements[i]!;
      if (sib.kind === 'elementGroup') continue;
      const sLeft = sib.x;
      const sRight = sib.x + sib.width;
      const sCenterX = sib.x + sib.width / 2;
      const sTop = sib.y;
      const sBottom = sib.y + sib.height;
      const sMiddleY = sib.y + sib.height / 2;
      for (const dx of [dxLeft, dxRight, dxCenter]) {
        for (const sx of [sLeft, sRight, sCenterX]) {
          if (Math.abs(dx - sx) <= 1) verticalSet.add(Math.round(sx));
        }
      }
      for (const dy of [dyTop, dyBottom, dyMiddle]) {
        for (const sy of [sTop, sBottom, sMiddleY]) {
          if (Math.abs(dy - sy) <= 1) horizontalSet.add(Math.round(sy));
        }
      }
    }
    if (verticalSet.size === 0 && horizontalSet.size === 0) {
      this.store.setDragGuides(null);
      return;
    }
    this.store.setDragGuides({
      section: sel.section,
      bandIndex: sel.bandIndex,
      groupName: sel.groupName,
      vertical: [...verticalSet].sort((a, b) => a - b),
      horizontal: [...horizontalSet].sort((a, b) => a - b),
    });
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    const state = this.dragState;
    this.dragState = null;
    if (!state) return;
    try {
      state.target.releasePointerCapture(state.pointerId);
    } catch {
      // ignore
    }
    state.target.removeEventListener('pointermove', this.onPointerMove);
    state.target.removeEventListener('pointerup', this.onPointerUp);
    state.target.removeEventListener('pointercancel', this.onPointerUp);
    if (state.active && this.store) {
      this.store.commitTransaction();
      this.store.setDragGuides(null);
    }
  };
}
