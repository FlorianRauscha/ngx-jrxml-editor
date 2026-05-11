import { Injectable, computed, signal } from '@angular/core';

import type { Band, BandSection } from '../model/band';
import type { AnyElement } from '../model/element';
import type { JasperReport } from '../model/report';
import {
  appendElementToBand,
  appendElementToCell,
  type ElementPath,
  getElementAt,
  getSiblingsContext,
  pathsEqual,
  removeElementAt,
  reorderElementAt,
  type TableCellRole,
  updateElementAt,
} from './path';
import { HIDDEN_PROP, LOCKED_PROP, isHidden, isLocked, setFlagProperty } from './editor-flags';
import { uuid } from './uuid';

const HISTORY_LIMIT = 100;

interface Snapshot {
  report: JasperReport;
  selections: ElementPath[];
}

/** Live drag-time guide overlay coordinates. Cleared when the drag ends. */
export interface DragGuides {
  /** Section + band where the dragged element lives. Renderer scopes the overlay. */
  section: BandSection;
  bandIndex: number;
  /** Required when the section is a group section, undefined otherwise. */
  groupName?: string;
  /** X coordinates (in band-local px) where vertical guide lines should appear. */
  vertical: number[];
  /** Y coordinates (in band-local px) where horizontal guide lines should appear. */
  horizontal: number[];
}

@Injectable()
export class EditorStore {
  private readonly _report = signal<JasperReport | null>(null);
  private readonly _selections = signal<ElementPath[]>([]);
  private readonly _past = signal<Snapshot[]>([]);
  private readonly _future = signal<Snapshot[]>([]);
  private readonly _clipboard = signal<AnyElement | null>(null);
  private readonly _zoom = signal<number>(1);
  private readonly _contextMenu = signal<{ x: number; y: number } | null>(null);
  private readonly _dragGuides = signal<DragGuides | null>(null);
  private inTransaction = false;

  readonly report = this._report.asReadonly();

  /** All currently selected element paths. The first entry is treated as the
   *  "primary" selection by single-target consumers (inspector, copy, paste). */
  readonly selections = this._selections.asReadonly();

  /** Backward-compatible single-selection accessor — returns the primary
   *  (first) selected path, or null when nothing is selected. */
  readonly selection = computed<ElementPath | null>(() => this._selections()[0] ?? null);

  readonly selectionCount = computed(() => this._selections().length);
  readonly hasMultiSelection = computed(() => this._selections().length > 1);

  readonly canUndo = computed(() => this._past().length > 0);
  readonly canRedo = computed(() => this._future().length > 0);
  readonly canPaste = computed(() => this._clipboard() !== null);
  readonly zoom = this._zoom.asReadonly();
  readonly contextMenu = this._contextMenu.asReadonly();
  readonly dragGuides = this._dragGuides.asReadonly();

  setDragGuides(guides: DragGuides | null): void {
    this._dragGuides.set(guides);
  }

  /** Sibling context for the primary selection — drives z-order menu state. */
  private readonly siblingsContext = computed<{ length: number; leafIndex: number } | null>(() => {
    const r = this._report();
    const sel = this._selections()[0];
    if (!r || !sel || this._selections().length > 1) return null;
    return getSiblingsContext(r, sel);
  });

  readonly canBringForward = computed(() => {
    const ctx = this.siblingsContext();
    return !!ctx && ctx.leafIndex < ctx.length - 1;
  });
  readonly canSendBackward = computed(() => {
    const ctx = this.siblingsContext();
    return !!ctx && ctx.leafIndex > 0;
  });

  /** Set the zoom factor, clamped to [0.25, 4]. */
  setZoom(z: number): void {
    if (!Number.isFinite(z)) return;
    const clamped = Math.min(4, Math.max(0.25, z));
    if (clamped === this._zoom()) return;
    this._zoom.set(clamped);
  }

  zoomIn(step = 0.1): void {
    this.setZoom(Math.round((this._zoom() + step) * 100) / 100);
  }

  zoomOut(step = 0.1): void {
    this.setZoom(Math.round((this._zoom() - step) * 100) / 100);
  }

  resetZoom(): void {
    this.setZoom(1);
  }

  readonly selectedElement = computed<AnyElement | null>(() => {
    const r = this._report();
    const sel = this._selections()[0];
    if (!r || !sel) return null;
    return getElementAt(r, sel) ?? null;
  });

  /** All resolved selected elements, skipping any whose path went stale. */
  readonly selectedElements = computed<AnyElement[]>(() => {
    const r = this._report();
    if (!r) return [];
    const out: AnyElement[] = [];
    for (const p of this._selections()) {
      const el = getElementAt(r, p);
      if (el) out.push(el);
    }
    return out;
  });

  setReport(report: JasperReport | null): void {
    this._report.set(report);
    if (report === null) this._selections.set([]);
    this._past.set([]);
    this._future.set([]);
  }

  /** Replace the current selection with `path` (or clear it when null). */
  select(path: ElementPath | null): void {
    const next = path ? [path] : [];
    if (sameSelections(next, this._selections())) return;
    this._selections.set(next);
  }

  /** Replace the selection with the given paths. Duplicates are dropped. */
  setSelections(paths: ElementPath[]): void {
    const deduped: ElementPath[] = [];
    for (const p of paths) {
      if (!deduped.some((q) => pathsEqual(p, q))) deduped.push(p);
    }
    if (sameSelections(deduped, this._selections())) return;
    this._selections.set(deduped);
  }

  /** Toggle a path's membership in the current selection. */
  toggleSelection(path: ElementPath): void {
    const cur = this._selections();
    const idx = cur.findIndex((p) => pathsEqual(p, path));
    if (idx >= 0) {
      const next = [...cur.slice(0, idx), ...cur.slice(idx + 1)];
      this._selections.set(next);
    } else {
      this._selections.set([...cur, path]);
    }
  }

  /** Add a path to the selection if not already present. */
  addSelection(path: ElementPath): void {
    const cur = this._selections();
    if (cur.some((p) => pathsEqual(p, path))) return;
    this._selections.set([...cur, path]);
  }

  isSelected(path: ElementPath): boolean {
    return this._selections().some((p) => pathsEqual(p, path));
  }

  /** Group multiple mutations into a single undo entry. The snapshot is taken
   *  at begin; intermediate mutations don't push to history. */
  beginTransaction(): void {
    if (this.inTransaction) return;
    this.snapshot();
    this.inTransaction = true;
  }

  commitTransaction(): void {
    this.inTransaction = false;
  }

  /** Discard intermediate changes and restore the pre-transaction snapshot. */
  cancelTransaction(): void {
    if (!this.inTransaction) return;
    this.inTransaction = false;
    this.undo();
  }

  undo(): void {
    const past = this._past();
    if (past.length === 0) return;
    const prev = past[past.length - 1]!;
    const current: Snapshot = {
      report: this._report()!,
      selections: this._selections(),
    };
    this._past.set(past.slice(0, -1));
    this._future.set([current, ...this._future()]);
    this._report.set(prev.report);
    this._selections.set(prev.selections);
  }

  redo(): void {
    const future = this._future();
    if (future.length === 0) return;
    const next = future[0]!;
    const current: Snapshot = {
      report: this._report()!,
      selections: this._selections(),
    };
    this._future.set(future.slice(1));
    this._past.set([...this._past(), current]);
    this._report.set(next.report);
    this._selections.set(next.selections);
  }

  /** Mutate the primary (first) selected element. */
  updateSelected<T extends AnyElement = AnyElement>(mutate: (element: T) => T): void {
    const r = this._report();
    const sel = this._selections()[0];
    if (!r || !sel) return;
    if (!this.inTransaction) this.snapshot();
    this._report.set(updateElementAt(r, sel, mutate));
  }

  /** Apply the same mutator to a list of element paths in a single report
   *  update. Use for batch transforms like alignment, distribution, drag-all. */
  updateMany<T extends AnyElement = AnyElement>(
    paths: ElementPath[],
    mutate: (element: T, path: ElementPath) => T,
  ): void {
    const r = this._report();
    if (!r || paths.length === 0) return;
    if (!this.inTransaction) this.snapshot();
    let next = r;
    for (const p of paths) {
      next = updateElementAt(next, p, (el) => mutate(el as T, p));
    }
    this._report.set(next);
  }

  /** Apply an arbitrary report-level mutation (e.g. fields, parameters). */
  updateReport(mutate: (report: JasperReport) => JasperReport): void {
    const r = this._report();
    if (!r) return;
    if (!this.inTransaction) this.snapshot();
    this._report.set(mutate(r));
  }

  /** Add an empty band to a section. For sections that take a single band,
   *  this is a no-op if one already exists. For group bands, `groupName`
   *  must identify an existing group. */
  addBand(section: BandSection, height = 30, groupName?: string): void {
    this.updateReport((r) => {
      const sections = { ...r.sections };
      const newBand: Band = { height, elements: [] };
      if (section === 'detail') {
        sections.detail = [...(sections.detail ?? []), newBand];
        return { ...r, sections };
      }
      if (section === 'groupHeader' || section === 'groupFooter') {
        if (!groupName || !r.groups) return r;
        const groups = [...r.groups];
        const idx = groups.findIndex((g) => g.name === groupName);
        if (idx < 0) return r;
        const target = groups[idx]!;
        if (section === 'groupHeader') {
          groups[idx] = { ...target, groupHeader: [...(target.groupHeader ?? []), newBand] };
        } else {
          groups[idx] = { ...target, groupFooter: [...(target.groupFooter ?? []), newBand] };
        }
        return { ...r, groups };
      }
      const map = sections as Record<string, Band | undefined>;
      if (map[section]) return r;
      map[section] = newBand;
      return { ...r, sections };
    });
  }

  /** Remove a band. For `detail` and group bands, pass the bandIndex to remove
   *  a specific band; for single-band sections, bandIndex is ignored. */
  removeBand(section: BandSection, bandIndex = 0, groupName?: string): void {
    this.updateReport((r) => {
      const sections = { ...r.sections };
      if (section === 'detail') {
        const detail = [...(sections.detail ?? [])];
        if (!detail[bandIndex]) return r;
        detail.splice(bandIndex, 1);
        sections.detail = detail.length > 0 ? detail : undefined;
        return { ...r, sections };
      }
      if (section === 'groupHeader' || section === 'groupFooter') {
        if (!groupName || !r.groups) return r;
        const groups = [...r.groups];
        const idx = groups.findIndex((g) => g.name === groupName);
        if (idx < 0) return r;
        const target = groups[idx]!;
        const list = section === 'groupHeader' ? target.groupHeader : target.groupFooter;
        if (!list || !list[bandIndex]) return r;
        const next = [...list];
        next.splice(bandIndex, 1);
        const cleaned = next.length > 0 ? next : undefined;
        groups[idx] =
          section === 'groupHeader'
            ? { ...target, groupHeader: cleaned }
            : { ...target, groupFooter: cleaned };
        return { ...r, groups };
      }
      const map = sections as Record<string, Band | undefined>;
      delete map[section];
      return { ...r, sections };
    });
    // Drop any selections that pointed inside the removed band.
    const filtered = this._selections().filter(
      (sel) =>
        !(
          sel.section === section &&
          (sel.groupName ?? undefined) === groupName &&
          (section !== 'detail' && section !== 'groupHeader' && section !== 'groupFooter'
            ? true
            : sel.bandIndex === bandIndex)
        ),
    );
    if (filtered.length !== this._selections().length) this._selections.set(filtered);
  }

  /** Mutate a single band by section + bandIndex (+ groupName for group bands). */
  updateBand(
    section: BandSection,
    bandIndex: number,
    mutate: (band: Band) => Band,
    groupName?: string,
  ): void {
    this.updateReport((r) => {
      const sections = { ...r.sections };
      if (section === 'detail') {
        const detail = [...(sections.detail ?? [])];
        const target = detail[bandIndex];
        if (!target) return r;
        detail[bandIndex] = mutate(target);
        sections.detail = detail;
        return { ...r, sections };
      }
      if (section === 'groupHeader' || section === 'groupFooter') {
        if (!groupName || !r.groups) return r;
        const groups = [...r.groups];
        const idx = groups.findIndex((g) => g.name === groupName);
        if (idx < 0) return r;
        const target = groups[idx]!;
        const list = section === 'groupHeader' ? target.groupHeader : target.groupFooter;
        if (!list || !list[bandIndex]) return r;
        const next = [...list];
        next[bandIndex] = mutate(next[bandIndex]!);
        groups[idx] =
          section === 'groupHeader'
            ? { ...target, groupHeader: next }
            : { ...target, groupFooter: next };
        return { ...r, groups };
      }
      const target = (sections as Record<string, Band | undefined>)[section];
      if (!target) return r;
      (sections as Record<string, Band>)[section] = mutate(target);
      return { ...r, sections };
    });
  }

  addElement(
    section: BandSection,
    bandIndex: number,
    element: AnyElement,
    groupName?: string,
  ): void {
    const r = this._report();
    if (!r) return;
    const result = appendElementToBand(r, section, bandIndex, element, groupName);
    if (!result) return;
    this.snapshot();
    this._report.set(result.report);
    this._selections.set([result.path]);
  }

  addElementToCell(
    tablePath: ElementPath,
    column: number,
    role: TableCellRole,
    element: AnyElement,
  ): void {
    const r = this._report();
    if (!r) return;
    const result = appendElementToCell(r, tablePath, column, role, element);
    if (!result) return;
    this.snapshot();
    this._report.set(result.report);
    this._selections.set([result.path]);
  }

  /** Delete every selected element. Removals are applied bottom-up so that
   *  earlier deletions don't shift the indices of later ones. */
  deleteSelected(): void {
    const r = this._report();
    const sels = this._selections();
    if (!r || sels.length === 0) return;
    const ordered = [...sels].sort(comparePathsDescending);
    this.snapshot();
    let next = r;
    for (const p of ordered) {
      next = removeElementAt(next, p);
    }
    this._report.set(next);
    this._selections.set([]);
  }

  copySelected(): void {
    const el = this.selectedElement();
    if (!el) return;
    this._clipboard.set(deepClone(el));
  }

  /** Copy the primary selection to the clipboard then delete every selected
   *  element. The delete creates exactly one undo entry. */
  cutSelected(): void {
    if (this._selections().length === 0) return;
    this.copySelected();
    this.deleteSelected();
  }

  /** Toggle `com.jaspersoft.studio.editor.locked` on every selected element. */
  toggleSelectionLocked(): void {
    const elements = this.selectedElements();
    if (elements.length === 0) return;
    const allLocked = elements.every(isLocked);
    this.updateMany(this._selections(), (el) => setFlagProperty(el, LOCKED_PROP, !allLocked));
  }

  /** Toggle `com.jaspersoft.studio.editor.hidden` on every selected element. */
  toggleSelectionHidden(): void {
    const elements = this.selectedElements();
    if (elements.length === 0) return;
    const allHidden = elements.every(isHidden);
    this.updateMany(this._selections(), (el) => setFlagProperty(el, HIDDEN_PROP, !allHidden));
  }

  /** True when EVERY selected element has the locked flag set. */
  readonly selectionLocked = computed(() => {
    const els = this.selectedElements();
    return els.length > 0 && els.every(isLocked);
  });

  /** True when EVERY selected element has the hidden flag set. */
  readonly selectionHidden = computed(() => {
    const els = this.selectedElements();
    return els.length > 0 && els.every(isHidden);
  });

  /** True when every selection is a top-level child of the same band (no
   *  tableCell, indices.length === 1, same section/bandIndex/groupName) and
   *  there are at least two of them. Drives the toolbar's "Group" enable. */
  readonly canGroupSelection = computed(() => {
    const sels = this._selections();
    if (sels.length < 2) return false;
    const first = sels[0]!;
    if (first.tableCell || first.indices.length !== 1) return false;
    for (const s of sels) {
      if (s.tableCell || s.indices.length !== 1) return false;
      if (s.section !== first.section) return false;
      if (s.bandIndex !== first.bandIndex) return false;
      if ((s.groupName ?? '') !== (first.groupName ?? '')) return false;
    }
    return true;
  });

  /** True when the single primary selection is an elementGroup at top-level. */
  readonly canUngroupSelection = computed(() => {
    if (this._selections().length !== 1) return false;
    const el = this.selectedElement();
    return !!el && el.kind === 'elementGroup';
  });

  /** Wrap the currently-selected sibling elements (under a common band) in an
   *  `<elementGroup>`. Selection becomes the new group's path. */
  groupSelected(): void {
    if (!this.canGroupSelection()) return;
    const sels = this._selections();
    const first = sels[0]!;
    const indices = sels.map((s) => s.indices[0]!).sort((a, b) => a - b);
    const minIndex = indices[0]!;
    this.snapshot();
    this.updateBand(
      first.section,
      first.bandIndex,
      (band) => {
        const grouped: AnyElement[] = [];
        const remaining: AnyElement[] = [];
        for (let i = 0; i < band.elements.length; i++) {
          if (indices.includes(i)) grouped.push(band.elements[i]!);
          else remaining.push(band.elements[i]!);
        }
        // Compute insertion index against `remaining` — translate band-local
        // minIndex to its position once the grouped items are gone.
        let insertAt = 0;
        let scanned = 0;
        for (let i = 0; i < band.elements.length && scanned < minIndex; i++) {
          if (!indices.includes(i)) {
            insertAt += 1;
            scanned += 1;
          } else {
            scanned += 1;
          }
        }
        const newGroup: AnyElement = { kind: 'elementGroup', children: grouped };
        remaining.splice(insertAt, 0, newGroup);
        return { ...band, elements: remaining };
      },
      first.groupName,
    );
    this._selections.set([{
      section: first.section,
      bandIndex: first.bandIndex,
      groupName: first.groupName,
      indices: [minIndex - sels.filter((s) => s.indices[0]! < minIndex).length],
    }]);
  }

  /** Unwrap the primary selection's elementGroup, splicing its children back
   *  into the parent at the same position. */
  ungroupSelected(): void {
    if (!this.canUngroupSelection()) return;
    const sel = this._selections()[0]!;
    if (sel.tableCell || sel.indices.length !== 1) return;
    this.snapshot();
    let insertedAt = sel.indices[0]!;
    let insertedCount = 0;
    this.updateBand(
      sel.section,
      sel.bandIndex,
      (band) => {
        const target = band.elements[sel.indices[0]!];
        if (!target || target.kind !== 'elementGroup') return band;
        const children = target.children;
        insertedCount = children.length;
        const next = [...band.elements];
        next.splice(sel.indices[0]!, 1, ...children);
        return { ...band, elements: next };
      },
      sel.groupName,
    );
    // Re-select the unwrapped children.
    if (insertedCount === 0) {
      this._selections.set([]);
    } else {
      const next: ElementPath[] = [];
      for (let i = 0; i < insertedCount; i++) {
        next.push({
          section: sel.section,
          bandIndex: sel.bandIndex,
          groupName: sel.groupName,
          indices: [insertedAt + i],
        });
      }
      this._selections.set(next);
    }
  }

  /** Reorder the primary selection within its parent's children array. */
  bringToFront(): void {
    this.reorderSelection((_, n) => n - 1);
  }
  sendToBack(): void {
    this.reorderSelection(() => 0);
  }
  bringForward(): void {
    this.reorderSelection((i) => i + 1);
  }
  sendBackward(): void {
    this.reorderSelection((i) => i - 1);
  }

  private reorderSelection(
    computeNewIndex: (currentIndex: number, length: number) => number,
  ): void {
    const r = this._report();
    const sel = this._selections()[0];
    if (!r || !sel) return;
    const result = reorderElementAt(r, sel, computeNewIndex);
    if (!result) return;
    if (!this.inTransaction) this.snapshot();
    this._report.set(result.report);
    this._selections.set([result.path]);
  }

  openContextMenu(x: number, y: number): void {
    this._contextMenu.set({ x, y });
  }
  closeContextMenu(): void {
    if (this._contextMenu() !== null) this._contextMenu.set(null);
  }

  paste(): void {
    const el = this._clipboard();
    const sel = this._selections()[0];
    const r = this._report();
    if (!el || !r) return;
    // Paste into the same band as the current selection (if any), otherwise the first detail band.
    const section = sel?.section ?? (r.sections.detail ? 'detail' : 'title');
    const bandIndex = sel?.bandIndex ?? 0;
    const offset = el.kind === 'elementGroup' ? el : { ...el, x: el.x + 10, y: el.y + 10 };
    const cloned = withFreshUuids(offset);
    const result = appendElementToBand(r, section, bandIndex, cloned);
    if (!result) return;
    this.snapshot();
    this._report.set(result.report);
    this._selections.set([result.path]);
  }

  private snapshot(): void {
    const r = this._report();
    if (!r) return;
    const past = this._past();
    const next = [...past, { report: r, selections: this._selections() }];
    if (next.length > HISTORY_LIMIT) next.splice(0, next.length - HISTORY_LIMIT);
    this._past.set(next);
    if (this._future().length > 0) this._future.set([]);
  }
}

function sameSelections(a: ElementPath[], b: ElementPath[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!pathsEqual(a[i]!, b[i]!)) return false;
  return true;
}

/** Order paths so deeper / later positions come first. Used for batch deletion
 *  so removing one element doesn't shift the indices of pending removals. */
function comparePathsDescending(a: ElementPath, b: ElementPath): number {
  // Compare top-level band index, then primary indices arrays lexicographically
  // descending. tableCell entries are compared after indices.
  if (a.section !== b.section) return a.section.localeCompare(b.section) * -1;
  if (a.bandIndex !== b.bandIndex) return b.bandIndex - a.bandIndex;
  for (let i = 0; i < Math.max(a.indices.length, b.indices.length); i++) {
    const ai = a.indices[i] ?? -1;
    const bi = b.indices[i] ?? -1;
    if (ai !== bi) return bi - ai;
  }
  // tableCell-deeper first.
  const ac = a.tableCell;
  const bc = b.tableCell;
  if (!ac && !bc) return 0;
  if (!ac) return 1;
  if (!bc) return -1;
  if (ac.column !== bc.column) return bc.column - ac.column;
  if (ac.role !== bc.role) return ac.role.localeCompare(bc.role) * -1;
  for (let i = 0; i < Math.max(ac.indices.length, bc.indices.length); i++) {
    const ai = ac.indices[i] ?? -1;
    const bi = bc.indices[i] ?? -1;
    if (ai !== bi) return bi - ai;
  }
  return 0;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withFreshUuids(el: AnyElement): AnyElement {
  if (el.kind === 'elementGroup') {
    return { ...el, children: el.children.map(withFreshUuids) };
  }
  const fresh: AnyElement = { ...el, uuid: uuid() };
  if (fresh.kind === 'frame') {
    return { ...fresh, children: fresh.children.map(withFreshUuids) };
  }
  return fresh;
}
