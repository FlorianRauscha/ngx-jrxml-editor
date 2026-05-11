import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';

import {
  type AlignMode,
  computeAlignment,
} from '../state/alignment';
import { EditorStore } from '../state/editor-store';
import type { ElementCommon } from '../model/element';
import { getElementAt, type ElementPath } from '../state/path';

/** Right-click context menu. Mounted by `JasperEditorComponent`; positioned in
 *  viewport coordinates from `store.contextMenu()`. The store owns the open
 *  state so the directive on every element can request it without prop-drilling. */
@Component({
  selector: 'lib-jasper-context-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 1000;
      }
      .jcm-backdrop {
        position: absolute;
        inset: 0;
      }
      .jcm-menu {
        position: absolute;
        background: #fff;
        border: 1px solid #d8dbe3;
        border-radius: 4px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
        font-size: 12px;
        font-family: -apple-system, system-ui, sans-serif;
        min-width: 180px;
        padding: 4px 0;
        user-select: none;
      }
      button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        width: 100%;
        padding: 6px 12px;
        background: transparent;
        border: none;
        font: inherit;
        color: #1a1d27;
        cursor: pointer;
        text-align: left;
      }
      button:hover:not(:disabled) {
        background: #4a6cf7;
        color: #fff;
      }
      button:disabled {
        color: #9ca3af;
        cursor: not-allowed;
      }
      .hint {
        color: #9ca3af;
        font-variant-numeric: tabular-nums;
        font-size: 11px;
      }
      button:hover:not(:disabled) .hint {
        color: rgba(255, 255, 255, 0.8);
      }
      .sep {
        height: 1px;
        background: #e1e4eb;
        margin: 4px 0;
      }
    `,
  ],
  template: `
    <div class="jcm-backdrop" (pointerdown)="close()" (contextmenu)="onBackdropContext($event)"></div>
    <div
      #menu
      class="jcm-menu"
      [style.left.px]="position().left"
      [style.top.px]="position().top"
      (pointerdown)="$event.stopPropagation()"
      (contextmenu)="$event.preventDefault()"
    >
      <button type="button" [disabled]="!hasSelection()" (click)="run('cut')">
        <span>Cut</span><span class="hint">{{ metaKey() }}X</span>
      </button>
      <button type="button" [disabled]="!hasSelection()" (click)="run('copy')">
        <span>Copy</span><span class="hint">{{ metaKey() }}C</span>
      </button>
      <button type="button" [disabled]="!store.canPaste()" (click)="run('paste')">
        <span>Paste</span><span class="hint">{{ metaKey() }}V</span>
      </button>
      <button type="button" [disabled]="!hasSelection()" (click)="run('delete')">
        <span>Delete</span><span class="hint">⌫</span>
      </button>
      <div class="sep"></div>
      <button type="button" [disabled]="!store.canBringForward()" (click)="run('bringToFront')">
        <span>Bring to Front</span>
      </button>
      <button type="button" [disabled]="!store.canBringForward()" (click)="run('bringForward')">
        <span>Bring Forward</span>
      </button>
      <button type="button" [disabled]="!store.canSendBackward()" (click)="run('sendBackward')">
        <span>Send Backward</span>
      </button>
      <button type="button" [disabled]="!store.canSendBackward()" (click)="run('sendToBack')">
        <span>Send to Back</span>
      </button>
      @if (canAlign()) {
        <div class="sep"></div>
        <button type="button" (click)="align('left')"><span>Align Left</span></button>
        <button type="button" (click)="align('h-center')"><span>Align Centers</span></button>
        <button type="button" (click)="align('right')"><span>Align Right</span></button>
        <button type="button" (click)="align('top')"><span>Align Top</span></button>
        <button type="button" (click)="align('v-center')"><span>Align Middles</span></button>
        <button type="button" (click)="align('bottom')"><span>Align Bottom</span></button>
      }
    </div>
  `,
})
export class JasperContextMenuComponent {
  protected readonly store = inject(EditorStore);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly anchor = input.required<{ x: number; y: number }>();

  /** Estimated menu size — refined after first render via the host listener. */
  private readonly menuSize = signal<{ width: number; height: number }>({
    width: 200,
    height: 320,
  });

  protected readonly position = computed<{ left: number; top: number }>(() => {
    const a = this.anchor();
    const size = this.menuSize();
    if (typeof window === 'undefined') return { left: a.x, top: a.y };
    const left = Math.max(4, Math.min(a.x, window.innerWidth - size.width - 4));
    const top = Math.max(4, Math.min(a.y, window.innerHeight - size.height - 4));
    return { left, top };
  });

  protected readonly hasSelection = computed(() => this.store.selectedElement() !== null);
  protected readonly canAlign = computed(
    () => this.store.selectedElements().filter((el) => el.kind !== 'elementGroup').length >= 2,
  );

  protected readonly metaKey = computed(() => {
    if (typeof navigator === 'undefined') return '⌘';
    return /mac/i.test(navigator.platform) ? '⌘' : 'Ctrl+';
  });

  ngAfterViewInit(): void {
    const menu = this.host.nativeElement.querySelector('.jcm-menu') as HTMLElement | null;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    this.menuSize.set({ width: rect.width, height: rect.height });
  }

  protected close(): void {
    this.store.closeContextMenu();
  }

  protected onBackdropContext(event: MouseEvent): void {
    event.preventDefault();
    this.close();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }

  protected run(
    action: 'cut' | 'copy' | 'paste' | 'delete' | 'bringToFront' | 'bringForward' | 'sendBackward' | 'sendToBack',
  ): void {
    switch (action) {
      case 'cut': this.store.cutSelected(); break;
      case 'copy': this.store.copySelected(); break;
      case 'paste': this.store.paste(); break;
      case 'delete': this.store.deleteSelected(); break;
      case 'bringToFront': this.store.bringToFront(); break;
      case 'bringForward': this.store.bringForward(); break;
      case 'sendBackward': this.store.sendBackward(); break;
      case 'sendToBack': this.store.sendToBack(); break;
    }
    this.close();
  }

  protected align(mode: AlignMode): void {
    const r = this.store.report();
    if (!r) return;
    const items: { path: ElementPath; el: ElementCommon }[] = [];
    for (const p of this.store.selections()) {
      const el = getElementAt(r, p);
      if (!el || el.kind === 'elementGroup') continue;
      items.push({ path: p, el });
    }
    if (items.length < 2) return;
    const patches = computeAlignment(items, mode);
    if (patches.length === 0) return;
    const byPath = new Map(patches.map((p) => [p.path, p]));
    this.store.updateMany(
      patches.map((p) => p.path),
      (el, path) => {
        const patch = byPath.get(path);
        if (!patch || el.kind === 'elementGroup') return el;
        return { ...el, x: patch.x ?? el.x, y: patch.y ?? el.y };
      },
    );
    this.close();
  }
}
