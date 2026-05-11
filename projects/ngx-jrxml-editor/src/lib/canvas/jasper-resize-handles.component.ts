import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';

import type { ElementCommon } from '../model/element';
import { EditorStore } from '../state/editor-store';
import { DEFAULT_GRID, snap } from '../state/snap';

export type ResizeHandleId =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

const HANDLES: { id: ResizeHandleId; cursor: string; top: string; left: string }[] = [
  { id: 'nw', cursor: 'nwse-resize', top: '-4px', left: '-4px' },
  { id: 'n', cursor: 'ns-resize', top: '-4px', left: 'calc(50% - 4px)' },
  { id: 'ne', cursor: 'nesw-resize', top: '-4px', left: 'calc(100% - 4px)' },
  { id: 'e', cursor: 'ew-resize', top: 'calc(50% - 4px)', left: 'calc(100% - 4px)' },
  { id: 'se', cursor: 'nwse-resize', top: 'calc(100% - 4px)', left: 'calc(100% - 4px)' },
  { id: 's', cursor: 'ns-resize', top: 'calc(100% - 4px)', left: 'calc(50% - 4px)' },
  { id: 'sw', cursor: 'nesw-resize', top: 'calc(100% - 4px)', left: '-4px' },
  { id: 'w', cursor: 'ew-resize', top: 'calc(50% - 4px)', left: '-4px' },
];

const MIN_SIZE = 5;

@Component({
  selector: 'lib-jasper-resize-handles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  styles: [
    `
      :host {
        position: absolute;
        display: block;
        pointer-events: none;
      }
      .handle {
        position: absolute;
        width: 8px;
        height: 8px;
        background: #fff;
        border: 1px solid #4a6cf7;
        box-sizing: border-box;
        pointer-events: auto;
      }
    `,
  ],
  template: `
    @for (h of handles; track h.id) {
      <div
        class="handle"
        [style.top]="h.top"
        [style.left]="h.left"
        [style.cursor]="h.cursor"
        (pointerdown)="onPointerDown($event, h.id)"
        (click)="$event.stopPropagation()"
      ></div>
    }
  `,
})
export class JasperResizeHandlesComponent {
  /** The element being resized. We snapshot its geometry on pointerdown. */
  readonly element = input.required<ElementCommon>();

  /** Emitted when a resize gesture begins (so the parent can stop its own
   *  pointerdown drag-to-move handler from firing). */
  readonly resizeStart = output<void>();

  protected readonly handles = HANDLES;

  private readonly store = inject(EditorStore);

  private dragState: {
    handle: ResizeHandleId;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    pointerId: number;
    target: HTMLElement;
  } | null = null;

  protected onPointerDown(event: PointerEvent, handle: ResizeHandleId): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    this.resizeStart.emit();
    const el = this.element();
    const target = event.currentTarget as HTMLElement;
    this.dragState = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      origX: el.x,
      origY: el.y,
      origW: el.width,
      origH: el.height,
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
    this.store.beginTransaction();
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const s = this.dragState;
    if (!s) return;
    const dx = event.clientX - s.startX;
    const dy = event.clientY - s.startY;
    const grid = DEFAULT_GRID;

    let x = s.origX;
    let y = s.origY;
    let w = s.origW;
    let h = s.origH;

    if (s.handle.includes('e')) {
      w = Math.max(MIN_SIZE, snap(s.origW + dx, grid));
    }
    if (s.handle.includes('w')) {
      const newX = Math.max(0, snap(s.origX + dx, grid));
      const dxClamped = newX - s.origX;
      w = Math.max(MIN_SIZE, s.origW - dxClamped);
      x = s.origX + (s.origW - w);
    }
    if (s.handle.includes('s')) {
      h = Math.max(MIN_SIZE, snap(s.origH + dy, grid));
    }
    if (s.handle.includes('n')) {
      const newY = Math.max(0, snap(s.origY + dy, grid));
      const dyClamped = newY - s.origY;
      h = Math.max(MIN_SIZE, s.origH - dyClamped);
      y = s.origY + (s.origH - h);
    }

    this.store.updateSelected((el) => ({ ...el, x, y, width: w, height: h }));
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const s = this.dragState;
    this.dragState = null;
    if (!s) return;
    try {
      s.target.releasePointerCapture(s.pointerId);
    } catch {
      // ignore — only relevant if setPointerCapture succeeded
    }
    s.target.removeEventListener('pointermove', this.onPointerMove);
    s.target.removeEventListener('pointerup', this.onPointerUp);
    s.target.removeEventListener('pointercancel', this.onPointerUp);
    this.store.commitTransaction();
  };
}
