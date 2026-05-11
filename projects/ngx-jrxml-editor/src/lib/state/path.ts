import type {
  AnyElement,
  ElementGroup,
  FrameElement,
  TableCell,
  TableElement,
} from '../model/element';
import type { Band, BandSection } from '../model/band';
import type { JasperReport } from '../model/report';

const SINGLE_SECTIONS: BandSection[] = [
  'background',
  'title',
  'pageHeader',
  'columnHeader',
  'columnFooter',
  'pageFooter',
  'lastPageFooter',
  'summary',
  'noData',
];

export type TableCellRole =
  | 'tableHeader'
  | 'columnHeader'
  | 'detailCell'
  | 'columnFooter'
  | 'tableFooter';

/** Address of an element nested arbitrarily deep in the report. */
export interface ElementPath {
  section: BandSection;
  /** Always 0 for sections holding a single band; index into the array for `detail`
   *  and group-bound bands. */
  bandIndex: number;
  /** Indices through nested elements (band.elements[i], then frame.children[j], ...).
   *  When the resolved element is a `componentElement` (table) and `tableCell` is
   *  set, the path continues inside the cell. */
  indices: number[];
  /** Required when `section` is `groupHeader` or `groupFooter` — names the group
   *  whose header/footer bands the path resolves into. Ignored for top-level
   *  sections. */
  groupName?: string;
  /** Optional further descent into a table cell. */
  tableCell?: {
    column: number;
    role: TableCellRole;
    /** Indices through cell.children (and frame.children if cell holds a frame). */
    indices: number[];
  };
}

export function pathsEqual(a: ElementPath | null, b: ElementPath | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.section !== b.section || a.bandIndex !== b.bandIndex) return false;
  if ((a.groupName ?? '') !== (b.groupName ?? '')) return false;
  if (!sameIndices(a.indices, b.indices)) return false;
  const ac = a.tableCell;
  const bc = b.tableCell;
  if (!ac && !bc) return true;
  if (!ac || !bc) return false;
  return ac.column === bc.column && ac.role === bc.role && sameIndices(ac.indices, bc.indices);
}

function sameIndices(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Append an element to a band; returns the new report and the path of the new element. */
export function appendElementToBand(
  report: JasperReport,
  section: BandSection,
  bandIndex: number,
  element: AnyElement,
  groupName?: string,
): { report: JasperReport; path: ElementPath } | null {
  const band = getBand(report, section, bandIndex, groupName);
  if (!band) return null;
  const newBand: Band = { ...band, elements: [...band.elements, element] };
  const newReport = setBand(report, section, bandIndex, newBand, groupName);
  return {
    report: newReport,
    path: {
      section,
      bandIndex,
      groupName,
      indices: [newBand.elements.length - 1],
    },
  };
}

/** Append an element to a specific table cell. The path identifies the table itself
 *  (its `tableCell` field is ignored if set). */
export function appendElementToCell(
  report: JasperReport,
  tablePath: ElementPath,
  column: number,
  role: TableCellRole,
  element: AnyElement,
): { report: JasperReport; path: ElementPath } | null {
  const tableEl = getElementAt(report, { ...tablePath, tableCell: undefined });
  if (!tableEl || tableEl.kind !== 'componentElement') return null;
  const updated = updateElementAt<TableElement>(
    report,
    { ...tablePath, tableCell: undefined },
    (t) => upsertCellElement(t, column, role, element),
  );
  // Compute the index of the appended element by re-reading the cell.
  const cell = readCell((updated as JasperReport), tablePath, column, role);
  if (!cell) return null;
  const newIndex = cell.children.length - 1;
  return {
    report: updated,
    path: { ...tablePath, tableCell: { column, role, indices: [newIndex] } },
  };
}

function upsertCellElement(
  table: TableElement,
  column: number,
  role: TableCellRole,
  element: AnyElement,
): TableElement {
  const columns = [...table.table.columns];
  const col = columns[column];
  if (!col) return table;
  const existing = col[role] ?? { children: [] as AnyElement[] };
  const newCell: TableCell = { ...existing, children: [...existing.children, element] };
  columns[column] = { ...col, [role]: newCell };
  return { ...table, table: { ...table.table, columns } };
}

function readCell(
  report: JasperReport,
  tablePath: ElementPath,
  column: number,
  role: TableCellRole,
): TableCell | undefined {
  const tableEl = getElementAt(report, { ...tablePath, tableCell: undefined });
  if (!tableEl || tableEl.kind !== 'componentElement' || tableEl.componentKind !== 'table')
    return undefined;
  return tableEl.table.columns[column]?.[role];
}

/** Remove the element at a path. Returns a new report (or original if path stale). */
export function removeElementAt(report: JasperReport, path: ElementPath): JasperReport {
  if (path.tableCell) {
    return updateElementAt<TableElement>(
      report,
      { ...path, tableCell: undefined },
      (t) => removeFromCell(t, path.tableCell!),
    );
  }
  const band = getBand(report, path.section, path.bandIndex, path.groupName);
  if (!band || path.indices.length === 0) return report;
  const newElements = removeElementsAt(band.elements, path.indices);
  return setBand(
    report,
    path.section,
    path.bandIndex,
    { ...band, elements: newElements },
    path.groupName,
  );
}

function removeFromCell(
  table: TableElement,
  cellPath: NonNullable<ElementPath['tableCell']>,
): TableElement {
  const columns = [...table.table.columns];
  const col = columns[cellPath.column];
  if (!col) return table;
  const cell = col[cellPath.role];
  if (!cell) return table;
  const newChildren = removeElementsAt(cell.children, cellPath.indices);
  columns[cellPath.column] = { ...col, [cellPath.role]: { ...cell, children: newChildren } };
  return { ...table, table: { ...table.table, columns } };
}

function removeElementsAt(elements: AnyElement[], indices: number[]): AnyElement[] {
  const [head, ...rest] = indices;
  const idx = head!;
  const target = elements[idx];
  if (!target) return elements;
  const next = [...elements];
  if (rest.length === 0) {
    next.splice(idx, 1);
  } else if (target.kind === 'frame') {
    const updatedFrame: FrameElement = {
      ...target,
      children: removeElementsAt(target.children, rest),
    };
    next[idx] = updatedFrame;
  } else if (target.kind === 'elementGroup') {
    const updated: ElementGroup = {
      ...target,
      children: removeElementsAt(target.children, rest),
    };
    next[idx] = updated;
  } else {
    return elements;
  }
  return next;
}

function getBand(
  report: JasperReport,
  section: BandSection,
  bandIndex: number,
  groupName?: string,
): Band | undefined {
  if (section === 'detail') return report.sections.detail?.[bandIndex];
  if (SINGLE_SECTIONS.includes(section)) {
    return (report.sections as Record<string, Band | undefined>)[section];
  }
  if (section === 'groupHeader' || section === 'groupFooter') {
    if (!groupName) return undefined;
    const group = report.groups?.find((g) => g.name === groupName);
    if (!group) return undefined;
    const bands = section === 'groupHeader' ? group.groupHeader : group.groupFooter;
    return bands?.[bandIndex];
  }
  return undefined;
}

function setBand(
  report: JasperReport,
  section: BandSection,
  bandIndex: number,
  band: Band,
  groupName?: string,
): JasperReport {
  const next: JasperReport = { ...report, sections: { ...report.sections } };
  if (section === 'detail') {
    const detail = [...(next.sections.detail ?? [])];
    detail[bandIndex] = band;
    next.sections.detail = detail;
    return next;
  }
  if (section === 'groupHeader' || section === 'groupFooter') {
    if (!groupName || !report.groups) return report;
    const groups = [...report.groups];
    const idx = groups.findIndex((g) => g.name === groupName);
    if (idx < 0) return report;
    const target = groups[idx]!;
    if (section === 'groupHeader') {
      const bands = [...(target.groupHeader ?? [])];
      bands[bandIndex] = band;
      groups[idx] = { ...target, groupHeader: bands };
    } else {
      const bands = [...(target.groupFooter ?? [])];
      bands[bandIndex] = band;
      groups[idx] = { ...target, groupFooter: bands };
    }
    return { ...next, groups };
  }
  (next.sections as Record<string, Band>)[section] = band;
  return next;
}

/** Resolve the element at a path. Returns undefined if the path is stale. */
export function getElementAt(report: JasperReport, path: ElementPath): AnyElement | undefined {
  const band = getBand(report, path.section, path.bandIndex, path.groupName);
  if (!band) return undefined;
  if (path.indices.length === 0) return undefined;
  let cursor: AnyElement | undefined = band.elements[path.indices[0]!];
  for (let i = 1; i < path.indices.length; i++) {
    if (!cursor) return undefined;
    if (cursor.kind === 'frame' || cursor.kind === 'elementGroup') {
      cursor = cursor.children[path.indices[i]!];
    } else {
      return undefined;
    }
  }
  if (!path.tableCell) return cursor;
  if (!cursor || cursor.kind !== 'componentElement' || cursor.componentKind !== 'table')
    return undefined;
  const cell = cursor.table.columns[path.tableCell.column]?.[path.tableCell.role];
  if (!cell || path.tableCell.indices.length === 0) return undefined;
  let inside: AnyElement | undefined = cell.children[path.tableCell.indices[0]!];
  for (let i = 1; i < path.tableCell.indices.length; i++) {
    if (!inside) return undefined;
    if (inside.kind === 'frame' || inside.kind === 'elementGroup') {
      inside = inside.children[path.tableCell.indices[i]!];
    } else {
      return undefined;
    }
  }
  return inside;
}

/** Read the parent array length and leaf index for the element at `path`.
 *  Used by the store's z-order can/will-do checks. Returns null if stale. */
export function getSiblingsContext(
  report: JasperReport,
  path: ElementPath,
): { length: number; leafIndex: number } | null {
  if (path.tableCell) {
    const cellPath = path.tableCell;
    if (cellPath.indices.length === 0) return null;
    if (cellPath.indices.length === 1) {
      const cell = readCell(report, path, cellPath.column, cellPath.role);
      if (!cell) return null;
      const leaf = cellPath.indices[0]!;
      if (leaf < 0 || leaf >= cell.children.length) return null;
      return { length: cell.children.length, leafIndex: leaf };
    }
    const parentIndices = cellPath.indices.slice(0, -1);
    const leaf = cellPath.indices[cellPath.indices.length - 1]!;
    const parent = getElementAt(report, {
      ...path,
      tableCell: { ...cellPath, indices: parentIndices },
    });
    if (!parent || (parent.kind !== 'frame' && parent.kind !== 'elementGroup')) return null;
    if (leaf < 0 || leaf >= parent.children.length) return null;
    return { length: parent.children.length, leafIndex: leaf };
  }
  const band = getBand(report, path.section, path.bandIndex, path.groupName);
  if (!band || path.indices.length === 0) return null;
  if (path.indices.length === 1) {
    const leaf = path.indices[0]!;
    if (leaf < 0 || leaf >= band.elements.length) return null;
    return { length: band.elements.length, leafIndex: leaf };
  }
  const parentIndices = path.indices.slice(0, -1);
  const leaf = path.indices[path.indices.length - 1]!;
  const parent = getElementAt(report, { ...path, indices: parentIndices });
  if (!parent || (parent.kind !== 'frame' && parent.kind !== 'elementGroup')) return null;
  if (leaf < 0 || leaf >= parent.children.length) return null;
  return { length: parent.children.length, leafIndex: leaf };
}

/** Reorder the element at `path` within its parent's children/elements array.
 *
 *  `computeNewIndex(currentIndex, length)` returns the desired insertion index;
 *  callers like `bringToFront` / `sendToBack` express their intent through it.
 *  Returns the new report and updated path, or null if the path is stale or
 *  the resulting index is identical (no-op). */
export function reorderElementAt(
  report: JasperReport,
  path: ElementPath,
  computeNewIndex: (currentIndex: number, length: number) => number,
): { report: JasperReport; path: ElementPath } | null {
  if (path.tableCell) {
    return reorderInsideCell(report, path, path.tableCell, computeNewIndex);
  }
  return reorderInsideBand(report, path, computeNewIndex);
}

function reorderInsideBand(
  report: JasperReport,
  path: ElementPath,
  computeNewIndex: (currentIndex: number, length: number) => number,
): { report: JasperReport; path: ElementPath } | null {
  const band = getBand(report, path.section, path.bandIndex, path.groupName);
  if (!band || path.indices.length === 0) return null;

  if (path.indices.length === 1) {
    const leaf = path.indices[0]!;
    const moved = reorderArray(band.elements, leaf, computeNewIndex(leaf, band.elements.length));
    if (!moved) return null;
    const newReport = setBand(
      report,
      path.section,
      path.bandIndex,
      { ...band, elements: moved.array },
      path.groupName,
    );
    return { report: newReport, path: { ...path, indices: [moved.newIndex] } };
  }

  const parentIndices = path.indices.slice(0, -1);
  const leaf = path.indices[path.indices.length - 1]!;
  const parentPath: ElementPath = { ...path, indices: parentIndices };
  const parent = getElementAt(report, parentPath);
  if (!parent || (parent.kind !== 'frame' && parent.kind !== 'elementGroup')) return null;
  const moved = reorderArray(parent.children, leaf, computeNewIndex(leaf, parent.children.length));
  if (!moved) return null;
  const newReport = updateElementAt(report, parentPath, (p) => {
    if (p.kind === 'frame') return { ...p, children: moved.array };
    if (p.kind === 'elementGroup') return { ...p, children: moved.array };
    return p;
  });
  return { report: newReport, path: { ...path, indices: [...parentIndices, moved.newIndex] } };
}

function reorderInsideCell(
  report: JasperReport,
  path: ElementPath,
  cellPath: NonNullable<ElementPath['tableCell']>,
  computeNewIndex: (currentIndex: number, length: number) => number,
): { report: JasperReport; path: ElementPath } | null {
  if (cellPath.indices.length === 0) return null;

  if (cellPath.indices.length === 1) {
    const cell = readCell(report, path, cellPath.column, cellPath.role);
    if (!cell) return null;
    const leaf = cellPath.indices[0]!;
    const moved = reorderArray(cell.children, leaf, computeNewIndex(leaf, cell.children.length));
    if (!moved) return null;
    const newReport = updateElementAt<TableElement>(
      report,
      { ...path, tableCell: undefined },
      (table) => {
        const columns = [...table.table.columns];
        const col = columns[cellPath.column];
        if (!col) return table;
        const c = col[cellPath.role];
        if (!c) return table;
        columns[cellPath.column] = { ...col, [cellPath.role]: { ...c, children: moved.array } };
        return { ...table, table: { ...table.table, columns } };
      },
    );
    return {
      report: newReport,
      path: { ...path, tableCell: { ...cellPath, indices: [moved.newIndex] } },
    };
  }

  const parentIndices = cellPath.indices.slice(0, -1);
  const leaf = cellPath.indices[cellPath.indices.length - 1]!;
  const parentPath: ElementPath = {
    ...path,
    tableCell: { ...cellPath, indices: parentIndices },
  };
  const parent = getElementAt(report, parentPath);
  if (!parent || (parent.kind !== 'frame' && parent.kind !== 'elementGroup')) return null;
  const moved = reorderArray(parent.children, leaf, computeNewIndex(leaf, parent.children.length));
  if (!moved) return null;
  const newReport = updateElementAt(report, parentPath, (p) => {
    if (p.kind === 'frame') return { ...p, children: moved.array };
    if (p.kind === 'elementGroup') return { ...p, children: moved.array };
    return p;
  });
  return {
    report: newReport,
    path: {
      ...path,
      tableCell: { ...cellPath, indices: [...parentIndices, moved.newIndex] },
    },
  };
}

function reorderArray<T>(arr: T[], from: number, to: number): { array: T[]; newIndex: number } | null {
  if (from < 0 || from >= arr.length) return null;
  const target = Math.max(0, Math.min(arr.length - 1, to));
  if (target === from) return null;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item!);
  return { array: next, newIndex: target };
}

/** Replace the element at a path by applying `mutate`. Returns a new report. */
export function updateElementAt<T extends AnyElement = AnyElement>(
  report: JasperReport,
  path: ElementPath,
  mutate: (element: T) => T,
): JasperReport {
  if (path.tableCell) {
    return updateElementAt<TableElement>(
      report,
      { ...path, tableCell: undefined },
      (t) => updateInCell(t, path.tableCell!, mutate),
    );
  }
  const band = getBand(report, path.section, path.bandIndex, path.groupName);
  if (!band || path.indices.length === 0) return report;
  const newElements = updateElementsAt(band.elements, path.indices, mutate);
  return setBand(
    report,
    path.section,
    path.bandIndex,
    { ...band, elements: newElements },
    path.groupName,
  );
}

function updateInCell<T extends AnyElement>(
  table: TableElement,
  cellPath: NonNullable<ElementPath['tableCell']>,
  mutate: (element: T) => T,
): TableElement {
  const columns = [...table.table.columns];
  const col = columns[cellPath.column];
  if (!col) return table;
  const cell = col[cellPath.role];
  if (!cell) return table;
  const newChildren = updateElementsAt(cell.children, cellPath.indices, mutate);
  columns[cellPath.column] = { ...col, [cellPath.role]: { ...cell, children: newChildren } };
  return { ...table, table: { ...table.table, columns } };
}

function updateElementsAt<T extends AnyElement>(
  elements: AnyElement[],
  indices: number[],
  mutate: (element: T) => T,
): AnyElement[] {
  const [head, ...rest] = indices;
  const idx = head!;
  const target = elements[idx];
  if (!target) return elements;
  const next = [...elements];
  if (rest.length === 0) {
    next[idx] = mutate(target as T);
  } else if (target.kind === 'frame') {
    const updatedFrame: FrameElement = {
      ...target,
      children: updateElementsAt(target.children, rest, mutate),
    };
    next[idx] = updatedFrame;
  } else if (target.kind === 'elementGroup') {
    const updated: ElementGroup = {
      ...target,
      children: updateElementsAt(target.children, rest, mutate),
    };
    next[idx] = updated;
  } else {
    return elements;
  }
  return next;
}
