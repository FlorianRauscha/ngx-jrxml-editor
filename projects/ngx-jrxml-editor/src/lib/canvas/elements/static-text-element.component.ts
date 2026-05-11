import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
} from '@angular/core';

import type { StaticTextElement } from '../../model/element';
import { EditorStore } from '../../state/editor-store';
import { resolveStyle } from '../../state/style-resolver';
import { computeTextElementCss, styleObjectToString } from '../element-styles';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { INTERACTION_STYLES } from './interaction-styles';

@Component({
  selector: 'jasper-static-text-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  host: {
    class: 'je-static-text',
    '[attr.style]': 'style()',
    '[class.je-editing]': 'editing()',
    '[attr.title]': "editing() ? null : 'Double-click (or click again when selected) to edit text'",
    '(dblclick)': 'onDoubleClick($event)',
  },
  template: `
    @if (editing()) {
      <div
        #editor
        class="je-text-editor"
        contenteditable="plaintext-only"
        spellcheck="false"
        (blur)="commit()"
        (keydown)="onKeyDown($event)"
        (pointerdown)="$event.stopPropagation()"
        (click)="$event.stopPropagation()"
      ></div>
    } @else {
      {{ element().text }}
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        overflow: hidden;
        white-space: pre-wrap;
        word-wrap: break-word;
        display: flex;
        padding: 1px 2px;
        box-sizing: border-box;
      }
      :host(.selectable.selected:not(.je-editing)) {
        cursor: text;
      }
      :host(.je-editing) {
        cursor: text;
        overflow: visible;
        outline: 2px solid #4a6cf7;
        outline-offset: 0;
      }
      .je-text-editor {
        flex: 1 1 auto;
        min-width: 0;
        outline: none;
        white-space: pre-wrap;
        word-wrap: break-word;
        font: inherit;
        color: inherit;
        text-align: inherit;
        line-height: inherit;
        letter-spacing: inherit;
        background: transparent;
        cursor: text;
      }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperStaticTextElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  private readonly store = inject(EditorStore, { optional: true });

  @ViewChild('editor') private editorRef?: ElementRef<HTMLElement>;

  protected readonly element = computed(() => this.interaction.element() as StaticTextElement);
  protected readonly editing = computed(() => this.interaction.editing());

  private readonly resolvedStyle = computed(() =>
    resolveStyle(this.element().style, this.store?.report()?.styles),
  );

  protected readonly style = computed(() =>
    styleObjectToString(computeTextElementCss(this.element(), this.resolvedStyle())),
  );

  /** Snapshot of the text value at edit-start, used to cancel on Escape. */
  private originalText = '';

  constructor() {
    // When entering edit mode, seed the editor with the current text and
    // focus/select it. We re-run on every editing flip so subsequent edits
    // still get fresh focus.
    effect(() => {
      if (!this.editing()) return;
      this.originalText = this.element().text ?? '';
      queueMicrotask(() => {
        const host = this.editorRef?.nativeElement;
        if (!host) return;
        host.textContent = this.originalText;
        host.focus();
        const range = document.createRange();
        range.selectNodeContents(host);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      });
    });
  }

  protected onDoubleClick(event: MouseEvent): void {
    const path = this.interaction.path();
    if (!path || !this.store) return;
    if (this.interaction.locked()) return;
    event.stopPropagation();
    event.preventDefault();
    this.store.startEditing(path);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancel();
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this.commit();
      return;
    }
    // Shift+Enter inserts a newline (browser default). Stop propagation so the
    // editor's global ⌘Z / ⌫ shortcuts don't fire while typing.
    event.stopPropagation();
  }

  protected commit(): void {
    if (!this.store) return;
    if (!this.interaction.editing()) return;
    const host = this.editorRef?.nativeElement;
    const next = host?.textContent ?? '';
    if (next !== this.originalText) {
      this.store.updateSelected<StaticTextElement>((el) => ({ ...el, text: next }));
    }
    this.store.stopEditing();
  }

  protected cancel(): void {
    if (!this.store) return;
    this.store.stopEditing();
  }
}
