import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { EditorStore } from '../state/editor-store';

type Trigger = 'F' | 'P' | 'V' | 'R';

interface Suggestion {
  /** Reference letter — `F` for field, `P` for parameter, `V` for variable, `R` for resource bundle key. */
  kind: Trigger;
  name: string;
  /** Optional metadata shown under the name (e.g. Java class). */
  detail?: string;
}

interface ActiveTrigger {
  kind: Trigger;
  /** Index of the `{` (one after `$X`). */
  openAt: number;
  /** Cursor position. */
  cursor: number;
  /** Substring already typed between `{` and cursor. */
  query: string;
}

/**
 * Single-line / multi-line expression input with a dropdown that suggests
 * `$F{}` / `$P{}` / `$V{}` / `$R{}` references typed by the user.
 *
 * The component owns its own DOM input but emits `valueChange` on every edit,
 * so consumers can treat it as a drop-in replacement for `<input ngModel>` /
 * `<textarea ngModel>`.
 */
@Component({
  selector: 'lib-expression-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  styles: [
    `
      :host {
        position: relative;
        display: block;
        min-width: 0;
      }
      input,
      textarea {
        width: 100%;
        min-width: 0;
        height: 26px;
        padding: 0 6px;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        font-family: inherit;
        font-size: 12px;
        background: #fff;
        box-sizing: border-box;
        line-height: 1;
      }
      textarea {
        height: auto;
        min-height: 48px;
        padding: 4px 6px;
        line-height: 1.4;
        resize: vertical;
      }
      .ei-suggest {
        position: absolute;
        z-index: 50;
        background: #fff;
        border: 1px solid #cfd3dc;
        border-radius: 4px;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        max-height: 220px;
        overflow-y: auto;
        min-width: 180px;
        padding: 2px;
      }
      .ei-suggest-item {
        display: grid;
        grid-template-columns: 26px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 3px;
      }
      .ei-suggest-item.active,
      .ei-suggest-item:hover {
        background: #f3f5f9;
      }
      .ei-kind {
        font-family: ui-monospace, Menlo, monospace;
        font-size: 10px;
        font-weight: 700;
        color: #4a6cf7;
        text-align: center;
        padding: 2px 4px;
        background: #eef0f4;
        border-radius: 3px;
      }
      .ei-name {
        font-size: 12px;
        color: #1a1d27;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ei-detail {
        font-size: 10px;
        color: #888;
        font-family: ui-monospace, Menlo, monospace;
      }
      .ei-empty {
        padding: 6px 10px;
        font-size: 11px;
        color: #888;
        font-style: italic;
      }
    `,
  ],
  template: `
    @if (multiline()) {
      <textarea
        #ta
        spellcheck="false"
        autocomplete="off"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="onInput($event)"
        (keydown)="onKeyDown($event)"
        (blur)="onBlur()"
      ></textarea>
    } @else {
      <input
        #ta
        type="text"
        spellcheck="false"
        autocomplete="off"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="onInput($event)"
        (keydown)="onKeyDown($event)"
        (blur)="onBlur()"
      />
    }
    @if (filteredSuggestions(); as list) {
      @if (open() && list.length > 0) {
        <div class="ei-suggest">
          @for (s of list; track s.kind + ':' + s.name; let i = $index) {
            <div
              class="ei-suggest-item"
              [class.active]="i === activeIndex()"
              (mousedown)="$event.preventDefault()"
              (click)="apply(s)"
              (mouseenter)="activeIndex.set(i)"
            >
              <span class="ei-kind">{{ '$' + s.kind }}</span>
              <span>
                <div class="ei-name">{{ s.name }}</div>
                @if (s.detail) {
                  <div class="ei-detail">{{ s.detail }}</div>
                }
              </span>
            </div>
          }
        </div>
      } @else if (open() && list.length === 0) {
        <div class="ei-suggest">
          <div class="ei-empty">No matching {{ activeTrigger()?.kind === 'F' ? 'fields' : activeTrigger()?.kind === 'P' ? 'parameters' : activeTrigger()?.kind === 'V' ? 'variables' : 'keys' }}.</div>
        </div>
      }
    }
  `,
})
export class ExpressionInputComponent {
  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly multiline = input<boolean>(false);

  readonly valueChange = output<string>();

  protected readonly ta = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('ta');
  private readonly store = inject(EditorStore, { optional: true });
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly open = signal<boolean>(false);
  protected readonly activeTrigger = signal<ActiveTrigger | null>(null);
  protected readonly activeIndex = signal<number>(0);

  /** All possible suggestions for the active trigger kind. */
  private readonly allSuggestions = computed<Suggestion[]>(() => {
    const trig = this.activeTrigger();
    if (!trig) return [];
    const r = this.store?.report();
    if (!r) return [];
    if (trig.kind === 'F') {
      return (r.fields ?? []).map((f) => ({ kind: 'F' as const, name: f.name, detail: f.class }));
    }
    if (trig.kind === 'P') {
      return (r.parameters ?? []).map((p) => ({ kind: 'P' as const, name: p.name, detail: p.class }));
    }
    if (trig.kind === 'V') {
      return (r.variables ?? []).map((v) => ({ kind: 'V' as const, name: v.name, detail: v.class }));
    }
    return [];
  });

  /** Suggestions filtered by the user's partial query (case-insensitive substring). */
  protected readonly filteredSuggestions = computed<Suggestion[]>(() => {
    const trig = this.activeTrigger();
    if (!trig) return [];
    const q = trig.query.toLowerCase();
    const all = this.allSuggestions();
    if (!q) return all;
    return all.filter((s) => s.name.toLowerCase().includes(q));
  });

  protected onInput(event: Event): void {
    const el = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.valueChange.emit(el.value);
    queueMicrotask(() => this.refreshTrigger());
  }

  /** Find the most recent unclosed `$F{` / `$P{` / `$V{` / `$R{` before the cursor. */
  private refreshTrigger(): void {
    const el = this.ta()?.nativeElement;
    if (!el) return;
    const cursor = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, cursor);
    // Walk backwards: find a `{` not yet matched, immediately preceded by `$F`/`$P`/`$V`/`$R`.
    let depth = 0;
    for (let i = cursor - 1; i >= 0; i--) {
      const ch = before[i];
      if (ch === '}') depth += 1;
      else if (ch === '{') {
        if (depth > 0) {
          depth -= 1;
          continue;
        }
        // Found an unmatched `{`. Check the two preceding chars.
        if (i >= 2 && before[i - 2] === '$') {
          const kind = before[i - 1];
          if (kind === 'F' || kind === 'P' || kind === 'V' || kind === 'R') {
            const query = before.slice(i + 1);
            // Bail if the user has already typed something disqualifying (newline, `}`).
            if (query.includes('}') || query.includes('\n')) {
              this.close();
              return;
            }
            const cur = this.activeTrigger();
            if (!cur || cur.openAt !== i || cur.kind !== kind || cur.query !== query) {
              this.activeTrigger.set({ kind, openAt: i, cursor, query });
              this.activeIndex.set(0);
            }
            this.open.set(true);
            return;
          }
        }
        this.close();
        return;
      }
    }
    this.close();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (!this.open()) return;
    const list = this.filteredSuggestions();
    if (list.length === 0) {
      if (event.key === 'Escape') this.close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) => (i + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => (i - 1 + list.length) % list.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      const choice = list[this.activeIndex()];
      if (choice) {
        event.preventDefault();
        this.apply(choice);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  protected onBlur(): void {
    // Defer to allow click on a suggestion to land first.
    setTimeout(() => this.close(), 100);
  }

  /** Close the dropdown without inserting anything. */
  private close(): void {
    if (this.open()) this.open.set(false);
    if (this.activeTrigger()) this.activeTrigger.set(null);
  }

  protected apply(s: Suggestion): void {
    const trig = this.activeTrigger();
    const el = this.ta()?.nativeElement;
    if (!trig || !el) return;
    const value = el.value;
    // Insert from `{` (exclusive) up to cursor: replace with `name}`.
    const insertion = `${s.name}}`;
    const before = value.slice(0, trig.openAt + 1);
    const after = value.slice(trig.cursor);
    const next = `${before}${insertion}${after}`;
    el.value = next;
    this.valueChange.emit(next);
    const newPos = (trig.openAt + 1) + insertion.length;
    el.setSelectionRange(newPos, newPos);
    this.close();
  }

  @HostListener('document:mousedown', ['$event'])
  protected onDocMouseDown(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) return;
    this.close();
  }
}
