import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { JasperIconComponent } from '@florianrauscha/ngx-jrxml-editor';

import { WorkspaceService } from './workspace.service';

@Component({
  selector: 'app-workspace-pane',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JasperIconComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        flex: 0 0 240px;
        min-width: 0;
        background: #1e2230;
        color: #c8ccd9;
        font-family: -apple-system, system-ui, sans-serif;
        font-size: 13px;
      }
      .ws-header {
        padding: 12px 14px 8px 14px;
        border-bottom: 1px solid #2a2e39;
      }
      .ws-name {
        font-weight: 600;
        font-size: 13px;
        color: #fff;
        margin: 0 0 8px 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ws-actions {
        display: flex;
        gap: 6px;
      }
      .ws-actions button {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 6px 8px;
        background: #2a2e39;
        color: #c8ccd9;
        border: 1px solid #3a3f4d;
        border-radius: 3px;
        font-size: 12px;
        font-family: inherit;
        cursor: pointer;
      }
      .ws-actions button:hover {
        background: #353a47;
        color: #fff;
      }
      .ws-section {
        padding: 12px 6px 4px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #6b7280;
      }
      .ws-section button {
        background: transparent;
        border: none;
        color: #6b7280;
        cursor: pointer;
        padding: 2px;
        display: inline-flex;
      }
      .ws-section button:hover {
        color: #fff;
      }
      .ws-list {
        list-style: none;
        margin: 0;
        padding: 0 6px 12px 6px;
        flex: 1;
        overflow: auto;
      }
      .ws-list li {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-family: ui-monospace, Menlo, monospace;
        font-size: 12px;
        color: #c8ccd9;
        position: relative;
      }
      .ws-list li:hover {
        background: #2a2e39;
      }
      .ws-list li.active {
        background: #4a6cf7;
        color: #fff;
      }
      .ws-list li.main::before {
        content: '★';
        color: #ffd166;
        font-size: 10px;
      }
      .ws-list li:not(.main)::before {
        content: '';
        width: 9px;
      }
      .ws-list .name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ws-list .row-action {
        opacity: 0;
        background: transparent;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 0 2px;
        font-size: 14px;
        line-height: 1;
        display: inline-flex;
      }
      .ws-list li:hover .row-action {
        opacity: 0.6;
      }
      .ws-list li:hover .row-action:hover {
        opacity: 1;
      }
      .ws-list li.main .row-action.set-main {
        display: none;
      }
      .ws-list .thumb {
        width: 16px;
        height: 16px;
        object-fit: contain;
        background: #2a2e39;
        border-radius: 2px;
        flex-shrink: 0;
      }
      .empty {
        padding: 6px 14px;
        font-size: 11px;
        color: #6b7280;
        font-style: italic;
      }
      input[type='file'] {
        display: none;
      }
    `,
  ],
  template: `
    <div class="ws-header">
      <h2 class="ws-name" [title]="workspace.name()">{{ workspace.name() }}</h2>
      <div class="ws-actions">
        <button type="button" (click)="zipFileRef().nativeElement.click()" title="Open workspace zip">
          <lib-icon name="folder-open" [size]="12" /> Open
        </button>
        <button type="button" (click)="onSaveZip()" title="Download workspace zip">
          <lib-icon name="save" [size]="12" /> Save
        </button>
        <button type="button" (click)="onReset()" title="Discard workspace and reload">
          <lib-icon name="trash" [size]="12" />
        </button>
      </div>
      <input
        #zipFileEl
        type="file"
        accept=".zip,application/zip"
        (change)="onOpenZip($event)"
      />
      <input
        #imageFileEl
        type="file"
        accept="image/*"
        multiple
        (change)="onUploadImages($event)"
      />
    </div>

    <div class="ws-section">
      <span>Reports</span>
      <button type="button" (click)="onAddReport()" title="New JRXML">
        <lib-icon name="plus" [size]="12" />
      </button>
    </div>
    <ul class="ws-list">
      @if (jrxmlFiles().length === 0) {
        <li class="empty" style="cursor: default; background: none">No reports yet</li>
      }
      @for (f of jrxmlFiles(); track f.path) {
        <li
          [class.active]="f.path === workspace.activePath()"
          [class.main]="f.path === workspace.mainReport()"
          (click)="workspace.setActive(f.path)"
        >
          <span class="name" [title]="f.path">{{ f.path }}</span>
          <button
            type="button"
            class="row-action set-main"
            title="Set as main report"
            (click)="onSetMain($event, f.path)"
          >★</button>
          <button
            type="button"
            class="row-action"
            title="Rename file"
            (click)="onRename($event, f.path)"
          >✎</button>
          <button
            type="button"
            class="row-action"
            title="Delete file"
            (click)="onDelete($event, f.path)"
          ><lib-icon name="x" [size]="12" /></button>
        </li>
      }
    </ul>

    <div class="ws-section">
      <span>Images</span>
      <button type="button" (click)="imageFileRef().nativeElement.click()" title="Upload image">
        <lib-icon name="plus" [size]="12" />
      </button>
    </div>
    <ul class="ws-list">
      @if (imageFiles().length === 0) {
        <li class="empty" style="cursor: default; background: none">No images yet</li>
      }
      @for (f of imageFiles(); track f.path) {
        <li>
          @if (imagePreviewUrl(f.path); as src) {
            <img class="thumb" [src]="src" [alt]="f.path" />
          }
          <span class="name" [title]="f.path">{{ f.path }}</span>
          <button
            type="button"
            class="row-action"
            title="Delete image"
            (click)="onDelete($event, f.path)"
          ><lib-icon name="x" [size]="12" /></button>
        </li>
      }
    </ul>
  `,
})
export class WorkspacePaneComponent {
  protected readonly workspace = inject(WorkspaceService);
  protected readonly zipFileRef = viewChild.required<ElementRef<HTMLInputElement>>('zipFileEl');
  protected readonly imageFileRef = viewChild.required<ElementRef<HTMLInputElement>>('imageFileEl');

  protected readonly jrxmlFiles = computed(() =>
    this.workspace.files().filter((f) => f.kind === 'jrxml'),
  );

  protected readonly imageFiles = computed(() =>
    this.workspace.files().filter((f) => f.kind === 'image'),
  );

  protected imagePreviewUrl(path: string): string | null {
    return this.workspace.resolveImageDataUrl(path);
  }

  protected onAddReport(): void {
    const name = window.prompt('New JRXML filename', 'subreport.jrxml');
    if (!name) return;
    const path = name.endsWith('.jrxml') ? name : `${name}.jrxml`;
    this.workspace.addJrxmlFile(path);
  }

  protected async onUploadImages(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    for (const file of files) {
      try {
        const base64 = await fileToBase64(file);
        this.workspace.addImageFile(`images/${file.name}`, base64);
      } catch (e) {
        window.alert(`Failed to read ${file.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  protected onDelete(event: Event, path: string): void {
    event.stopPropagation();
    if (!window.confirm(`Delete ${path}?`)) return;
    this.workspace.removeFile(path);
  }

  protected onRename(event: Event, oldPath: string): void {
    event.stopPropagation();
    const next = window.prompt('Rename to', oldPath);
    if (!next || next === oldPath) return;
    const target = next.endsWith('.jrxml') ? next : `${next}.jrxml`;
    const result = this.workspace.renameFile(oldPath, target);
    if (!result.ok) window.alert(`Rename failed: ${result.reason}`);
  }

  protected onSetMain(event: Event, path: string): void {
    event.stopPropagation();
    this.workspace.setMainReport(path);
  }

  protected async onOpenZip(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await this.workspace.importZip(file, file.name.replace(/\.zip$/i, ''));
    } catch (e) {
      window.alert(`Failed to open zip: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  protected onReset(): void {
    const fileCount = this.workspace.files().length;
    if (fileCount > 1 && !window.confirm(`Discard the entire workspace (${fileCount} files)?`)) {
      return;
    }
    this.workspace.clearPersisted();
    window.location.reload();
  }

  protected async onSaveZip(): Promise<void> {
    const blob = await this.workspace.exportZip();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${this.workspace.name()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      // FileReader.readAsDataURL returns "data:<mime>;base64,<payload>" — strip
      // the prefix so the workspace stores raw base64 (zip-friendly).
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}
