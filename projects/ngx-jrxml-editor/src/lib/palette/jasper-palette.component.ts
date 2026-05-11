import { ChangeDetectionStrategy, Component } from '@angular/core';

import { JasperIconComponent, type JasperIconName } from '../icon/jasper-icon.component';
import { PALETTE_ITEMS, type CreatableKind } from '../state/element-factory';

/** MIME type used to pass the dragged element kind through dataTransfer. */
export const PALETTE_DRAG_MIME = 'application/x-jasper-element-kind';

@Component({
  selector: 'lib-jasper-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JasperIconComponent],
  styles: [
    `
      :host {
        display: block;
        background: #f7f8fb;
        border-right: 1px solid #d8dbe3;
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
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        background: #fff;
        border: 1px solid #d8dbe3;
        border-radius: 4px;
        cursor: grab;
        user-select: none;
      }
      li:hover {
        border-color: #4a6cf7;
        background: #f5f8ff;
      }
      li:active {
        cursor: grabbing;
      }
      .pal-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #eef0f4;
        border-radius: 3px;
        color: #4a4f5b;
      }
      .pal-label {
        flex: 1;
      }
    `,
  ],
  template: `
    <header>Palette</header>
    <ul>
      @for (item of items; track item.kind) {
        <li
          draggable="true"
          (dragstart)="onDragStart($event, item.kind)"
        >
          <span class="pal-icon">
            <lib-icon [name]="iconName(item.icon)" [size]="14" />
          </span>
          <span class="pal-label">{{ item.label }}</span>
        </li>
      }
    </ul>
  `,
})
export class JasperPaletteComponent {
  protected readonly items = PALETTE_ITEMS;

  protected iconName(name: string): JasperIconName {
    return name as JasperIconName;
  }

  protected onDragStart(event: DragEvent, kind: CreatableKind): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(PALETTE_DRAG_MIME, kind);
    event.dataTransfer.setData('text/plain', kind);
    event.dataTransfer.effectAllowed = 'copy';
  }
}
