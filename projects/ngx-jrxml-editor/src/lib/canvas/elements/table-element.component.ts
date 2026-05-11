import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';

import type { AnyElement, TableElement } from '../../model/element';
import { PALETTE_DRAG_MIME } from '../../palette/jasper-palette.component';
import { EditorStore } from '../../state/editor-store';
import { createDefaultElement, type CreatableKind } from '../../state/element-factory';
import type { ElementPath, TableCellRole } from '../../state/path';
import { resolveStyle } from '../../state/style-resolver';
import {
  commonElementStyle,
  effectiveCommon,
  styleObjectToString,
} from '../element-styles';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { JasperElementComponent } from '../jasper-element.component';
import { INTERACTION_STYLES } from './interaction-styles';

interface TableRowVm {
  role: TableCellRole;
  kind: 'header' | 'detail' | 'footer';
  height: number;
  cells: { column: number; width: number; children: AnyElement[] }[];
}

const ROLE_ORDER: { role: TableCellRole; kind: 'header' | 'detail' | 'footer' }[] = [
  { role: 'tableHeader', kind: 'header' },
  { role: 'columnHeader', kind: 'header' },
  { role: 'detailCell', kind: 'detail' },
  { role: 'columnFooter', kind: 'footer' },
  { role: 'tableFooter', kind: 'footer' },
];

@Component({
  selector: 'jasper-table-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  imports: [forwardRef(() => JasperElementComponent)],
  host: {
    class: 'je-table',
    '[attr.style]': 'style()',
  },
  template: `
    @for (row of rows(); track row.role) {
      <div
        class="je-trow"
        [class.header]="row.kind === 'header'"
        [class.footer]="row.kind === 'footer'"
      >
        @for (cell of row.cells; track cell.column) {
          <div
            #cellEl
            class="je-tcell"
            [class.drag-over]="dragOverCell() === row.role + ':' + cell.column"
            [style.width.px]="cell.width"
            [style.height.px]="row.height"
            (click)="onCellClick($event)"
            (dragover)="onCellDragOver($event, row.role, cell.column)"
            (dragleave)="onCellDragLeave()"
            (drop)="onCellDrop($event, row.role, cell.column, cellEl)"
          >
            @for (child of cell.children; track $index; let ei = $index) {
              <lib-jasper-element
                [element]="child"
                [path]="cellChildPath(cell.column, row.role, ei)"
              />
            }
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        border: 1px solid #d0d4dc;
        background: #fff;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-size: 11px;
        box-sizing: border-box;
      }
      .je-trow {
        display: flex;
        border-bottom: 1px solid #e5e7ec;
      }
      .je-trow:last-child {
        border-bottom: none;
      }
      .je-tcell {
        position: relative;
        border-right: 1px solid #e5e7ec;
        overflow: hidden;
        background: #fff;
      }
      .je-tcell:last-child {
        border-right: none;
      }
      .je-trow.header .je-tcell,
      .je-trow.footer .je-tcell {
        background: #f3f5f9;
      }
      .je-tcell.drag-over {
        background: #f5f8ff;
        outline: 2px solid #4a6cf7;
        outline-offset: -2px;
      }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperTableElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  private readonly store = inject(EditorStore, { optional: true });

  protected readonly element = computed(() => this.interaction.element() as TableElement);

  private readonly resolvedStyle = computed(() =>
    resolveStyle(this.element().style, this.store?.report()?.styles),
  );

  protected readonly style = computed(() =>
    styleObjectToString(commonElementStyle(effectiveCommon(this.element(), this.resolvedStyle()))),
  );

  protected readonly rows = computed<TableRowVm[]>(() => {
    const t = this.element().table;
    const out: TableRowVm[] = [];
    for (const { role, kind } of ROLE_ORDER) {
      if (!t.columns.some((c) => c[role])) continue;
      const heights = t.columns.map((c) => c[role]?.height ?? 0);
      const height = Math.max(...heights, 20);
      out.push({
        role,
        kind,
        height,
        cells: t.columns.map((c, i) => ({
          column: i,
          width: c.width,
          children: c[role]?.children ?? [],
        })),
      });
    }
    return out;
  });

  protected readonly dragOverCell = signal<string | null>(null);

  protected cellChildPath(column: number, role: TableCellRole, index: number): ElementPath | null {
    const p = this.interaction.path();
    if (!p) return null;
    return { ...p, tableCell: { column, role, indices: [index] } };
  }

  protected onCellClick(event: Event): void {
    const p = this.interaction.path();
    if (!p || !this.store) return;
    event.stopPropagation();
    // Click on bare cell area (not a child element) → select the table itself.
    this.store.select(p);
  }

  protected onCellDragOver(event: DragEvent, role: TableCellRole, column: number): void {
    if (!this.interaction.path() || !this.store) return;
    if (!event.dataTransfer?.types.includes(PALETTE_DRAG_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    const key = `${role}:${column}`;
    if (this.dragOverCell() !== key) this.dragOverCell.set(key);
  }

  protected onCellDragLeave(): void {
    this.dragOverCell.set(null);
  }

  protected onCellDrop(
    event: DragEvent,
    role: TableCellRole,
    column: number,
    cellEl: HTMLElement,
  ): void {
    const p = this.interaction.path();
    if (!p || !this.store) return;
    const kind = event.dataTransfer?.getData(PALETTE_DRAG_MIME) as CreatableKind | '';
    if (!kind) return;
    event.preventDefault();
    event.stopPropagation();
    this.dragOverCell.set(null);
    const rect = cellEl.getBoundingClientRect();
    const x = Math.max(0, Math.round(event.clientX - rect.left));
    const y = Math.max(0, Math.round(event.clientY - rect.top));
    this.store.addElementToCell(p, column, role, createDefaultElement(kind, x, y));
  }
}
