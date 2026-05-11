import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { JasperIconComponent } from '../icon/jasper-icon.component';

@Component({
  selector: 'lib-jasper-source',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, JasperIconComponent],
  styles: [
    `
      :host {
        display: block;
        position: relative;
        height: 100%;
        background: #fff;
        font-family: ui-monospace, Menlo, Consolas, monospace;
        font-size: 13px;
        line-height: 1.45;
      }
      .src-wrap {
        position: absolute;
        inset: 0;
        display: flex;
        overflow: hidden;
      }
      .src-gutter {
        flex: 0 0 auto;
        width: 52px;
        background: #f4f5f8;
        border-right: 1px solid #e1e4eb;
        position: relative;
        overflow: hidden;
        font: inherit;
        color: #8a8a8a;
      }
      .src-gutter-inner {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: 12px 8px 12px 0;
        text-align: right;
        font-variant-numeric: tabular-nums;
        line-height: 1.45;
        will-change: transform;
        user-select: none;
      }
      .src-ln {
        height: 1.45em;
        padding-right: 2px;
      }
      .src-content {
        flex: 1;
        min-width: 0;
        position: relative;
        overflow: hidden;
      }
      .src-hl,
      .src-input {
        position: absolute;
        inset: 0;
        margin: 0;
        padding: 12px 16px;
        white-space: pre;
        overflow: auto;
        font: inherit;
        tab-size: 2;
        -moz-tab-size: 2;
        box-sizing: border-box;
      }
      .src-hl {
        pointer-events: none;
        color: #1a1d27;
        background: transparent;
      }
      .src-input {
        background: transparent;
        color: transparent;
        caret-color: #1a1d27;
        border: none;
        resize: none;
        outline: none;
        z-index: 1;
      }
      .src-input::selection {
        background: rgba(74, 108, 247, 0.2);
        color: transparent;
      }
      .err-bar {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 8px 16px;
        background: #fdecea;
        color: #b00020;
        font-size: 12px;
        border-top: 1px solid #f5c6cb;
        z-index: 2;
        font-family: -apple-system, system-ui, sans-serif;
      }
      .src-find {
        position: absolute;
        top: 8px;
        right: 16px;
        background: #fff;
        border: 1px solid #d8dbe3;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        border-radius: 4px;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 3;
        font-family: -apple-system, system-ui, sans-serif;
        font-size: 12px;
      }
      .src-find-row {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .src-find input {
        flex: 1;
        min-width: 180px;
        height: 26px;
        padding: 0 6px;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        font: inherit;
        font-size: 12px;
        box-sizing: border-box;
      }
      .src-find button {
        height: 26px;
        padding: 0 8px;
        border: 1px solid #cfd3dc;
        background: #fff;
        border-radius: 3px;
        cursor: pointer;
        color: #1a1d27;
        font-family: inherit;
        font-size: 11px;
        white-space: nowrap;
      }
      .src-find button:hover { background: #f3f5f9; border-color: #4a6cf7; color: #4a6cf7; }
      .src-find button.icon { width: 26px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
      .src-find .src-find-count {
        font-variant-numeric: tabular-nums;
        color: #555;
        padding: 0 4px;
        min-width: 56px;
        text-align: center;
      }
      .src-ln-err {
        background: rgba(176, 0, 32, 0.18);
        color: #b00020;
        font-weight: 600;
      }
    `,
  ],
  template: `
    <div class="src-wrap">
      <div class="src-gutter" #gutter>
        <div class="src-gutter-inner" #gutterInner>
          @for (n of lineNumbers(); track n) {
            <div class="src-ln" [class.src-ln-err]="n === errorLine()">{{ n }}</div>
          }
        </div>
      </div>
      <div class="src-content">
        <pre class="src-hl" #hl><code [innerHTML]="highlighted()"></code></pre>
        <textarea
          #ta
          class="src-input"
          spellcheck="false"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          [value]="value()"
          (input)="onInput($event)"
          (scroll)="onScroll()"
        ></textarea>
      </div>
    </div>
    @if (findOpen()) {
      <div class="src-find">
        <div class="src-find-row">
          <input
            #findInput
            type="text"
            placeholder="Find"
            [ngModel]="findText()"
            (ngModelChange)="findText.set($event)"
            (keydown.enter)="findNext()"
          />
          <span class="src-find-count">{{ findCountLabel() }}</span>
          <button type="button" (click)="findPrev()" title="Previous (⇧⏎)">↑</button>
          <button type="button" (click)="findNext()" title="Next (⏎)">↓</button>
          <button type="button" class="icon" (click)="closeFind()" title="Close (Esc)">
            <lib-icon name="x" [size]="14" />
          </button>
        </div>
        <div class="src-find-row">
          <input
            type="text"
            placeholder="Replace with"
            [ngModel]="replaceText()"
            (ngModelChange)="replaceText.set($event)"
          />
          <button type="button" (click)="replaceCurrent()">Replace</button>
          <button type="button" (click)="replaceAll()">Replace all</button>
        </div>
      </div>
    }
    @if (error()) {
      <div class="err-bar">{{ error() }}</div>
    }
  `,
})
export class JasperSourceComponent {
  readonly value = input<string>('');
  readonly error = input<string | null>(null);
  readonly valueChange = output<string>();

  protected readonly gutterInner = viewChild<ElementRef<HTMLElement>>('gutterInner');
  protected readonly hlEl = viewChild<ElementRef<HTMLElement>>('hl');
  protected readonly ta = viewChild<ElementRef<HTMLTextAreaElement>>('ta');
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly highlighted = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(highlightXml(this.value())),
  );

  protected readonly lineNumbers = computed<number[]>(() => {
    const lines = this.value().split('\n').length;
    return Array.from({ length: lines }, (_, i) => i + 1);
  });

  protected onInput(event: Event): void {
    const t = (event.target as HTMLTextAreaElement).value;
    this.valueChange.emit(t);
  }

  protected onScroll(): void {
    const ta = this.ta()?.nativeElement;
    if (!ta) return;
    const top = ta.scrollTop;
    const left = ta.scrollLeft;
    const inner = this.gutterInner()?.nativeElement;
    if (inner) inner.style.transform = `translateY(${-top}px)`;
    const hl = this.hlEl()?.nativeElement;
    if (hl) {
      hl.scrollTop = top;
      hl.scrollLeft = left;
    }
  }

  // ---------- Find / Replace -------------------------------------------------

  protected readonly findOpen = signal<boolean>(false);
  protected readonly findText = signal<string>('');
  protected readonly replaceText = signal<string>('');
  protected readonly findInputRef = viewChild<ElementRef<HTMLInputElement>>('findInput');

  /** Cached match offsets in the textarea value, recomputed on demand. */
  private currentMatches(): number[] {
    const needle = this.findText();
    if (!needle) return [];
    const hay = this.value();
    const out: number[] = [];
    let i = hay.indexOf(needle);
    while (i >= 0) {
      out.push(i);
      i = hay.indexOf(needle, i + Math.max(1, needle.length));
    }
    return out;
  }

  protected findCountLabel(): string {
    const n = this.currentMatches().length;
    if (!this.findText()) return '';
    return n === 0 ? '0' : `${n}`;
  }

  /** Parse "line N column M" out of a typical fast-xml-parser error message. */
  protected readonly errorLine = computed<number | null>(() => {
    const e = this.error();
    if (!e) return null;
    const m = /line\s*[:#]?\s*(\d+)/i.exec(e);
    return m ? Number(m[1]) : null;
  });

  protected openFind(): void {
    this.findOpen.set(true);
    queueMicrotask(() => this.findInputRef()?.nativeElement.focus());
  }

  protected closeFind(): void {
    this.findOpen.set(false);
    this.ta()?.nativeElement.focus();
  }

  protected findNext(): void {
    const matches = this.currentMatches();
    if (matches.length === 0) return;
    const ta = this.ta()?.nativeElement;
    if (!ta) return;
    const cursor = ta.selectionEnd;
    const next = matches.find((m) => m >= cursor) ?? matches[0]!;
    ta.focus();
    ta.setSelectionRange(next, next + this.findText().length);
    this.scrollSelectionIntoView();
  }

  protected findPrev(): void {
    const matches = this.currentMatches();
    if (matches.length === 0) return;
    const ta = this.ta()?.nativeElement;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = matches.filter((m) => m < cursor);
    const prev = before.length > 0 ? before[before.length - 1]! : matches[matches.length - 1]!;
    ta.focus();
    ta.setSelectionRange(prev, prev + this.findText().length);
    this.scrollSelectionIntoView();
  }

  /** Replace the currently-selected match (if any) and advance to the next. */
  protected replaceCurrent(): void {
    const ta = this.ta()?.nativeElement;
    if (!ta) return;
    const needle = this.findText();
    if (!needle) return;
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    if (sel === needle) {
      const next = ta.value.slice(0, ta.selectionStart) + this.replaceText() + ta.value.slice(ta.selectionEnd);
      this.valueChange.emit(next);
      // After the value-change round-trip the caret stays where it was; advance
      // selection past the replacement on the next tick.
      const newPos = ta.selectionStart + this.replaceText().length;
      queueMicrotask(() => {
        ta.setSelectionRange(newPos, newPos);
        this.findNext();
      });
    } else {
      this.findNext();
    }
  }

  protected replaceAll(): void {
    const needle = this.findText();
    if (!needle) return;
    const next = this.value().split(needle).join(this.replaceText());
    if (next !== this.value()) this.valueChange.emit(next);
  }

  private scrollSelectionIntoView(): void {
    const ta = this.ta()?.nativeElement;
    if (!ta) return;
    // Approximate: jump to the line containing selectionStart.
    const upToCursor = ta.value.slice(0, ta.selectionStart);
    const line = upToCursor.split('\n').length - 1;
    const lineHeight = 1.45 * 13; // px (matches CSS font-size + line-height)
    const targetTop = line * lineHeight;
    if (targetTop < ta.scrollTop || targetTop > ta.scrollTop + ta.clientHeight - 2 * lineHeight) {
      ta.scrollTop = Math.max(0, targetTop - ta.clientHeight / 2);
    }
  }

  @HostListener('keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      this.openFind();
      return;
    }
    if (event.key === 'Escape' && this.findOpen()) {
      event.preventDefault();
      this.closeFind();
      return;
    }
    if (this.findOpen() && event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      if (event.shiftKey) this.findPrev();
      else this.findNext();
    }
  }
}

const STYLE = {
  tg: 'color:#4a6cf7',
  at: 'color:#b8336a',
  vl: 'color:#2a8a3f',
  cm: 'color:#8a8a8a;font-style:italic',
  cdMk: 'color:#8a8a8a',
  pi: 'color:#8a8a8a',
} as const;

const JAVA = {
  jrPrefix: 'color:#9333ea;font-weight:600',
  jrName: 'color:#c2410c',
  str: 'color:#2a8a3f',
  num: 'color:#b8336a',
  kw: 'color:#4a6cf7;font-weight:600',
  type: 'color:#0d7c97',
  ident: 'color:#1a1d27',
} as const;

const JAVA_KEYWORDS = new Set([
  'new', 'null', 'true', 'false', 'if', 'else', 'return', 'instanceof',
  'this', 'super', 'throw', 'throws', 'catch', 'try', 'finally', 'while',
  'for', 'do', 'switch', 'case', 'break', 'continue', 'void', 'int',
  'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'class',
  'interface', 'extends', 'implements',
]);

const JAVA_TYPES = new Set([
  'String', 'Integer', 'Long', 'Double', 'Float', 'Boolean', 'BigDecimal',
  'BigInteger', 'Date', 'Calendar', 'Timestamp', 'Object', 'List', 'Map',
  'Set', 'Collection', 'Number', 'Math', 'System', 'StringBuilder',
  'StringBuffer', 'Locale', 'Arrays', 'Collections',
]);

function highlightXml(xml: string): string {
  let html = xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // CDATA: highlight markers, then run a Java/JR-expression highlighter on the content.
  html = html.replace(
    /(&lt;!\[CDATA\[)([\s\S]*?)(\]\]&gt;)/g,
    (_m, open: string, content: string, close: string) =>
      `<span style="${STYLE.cdMk}">${open}</span>${highlightJava(content)}<span style="${STYLE.cdMk}">${close}</span>`,
  );
  html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, `<span style="${STYLE.cm}">$1</span>`);
  html = html.replace(/(&lt;\?[\s\S]*?\?&gt;)/g, `<span style="${STYLE.pi}">$1</span>`);
  html = html.replace(
    /(&lt;\/?)([a-zA-Z][\w:.-]*)/g,
    `$1<span style="${STYLE.tg}">$2</span>`,
  );
  html = html.replace(
    /(\s)([a-zA-Z][\w:.-]*)=(&quot;)([^&]*?)(&quot;)/g,
    `$1<span style="${STYLE.at}">$2</span>=$3<span style="${STYLE.vl}">$4</span>$5`,
  );
  return html;
}

/** Highlight Java / JR-expression text. The input is already HTML-escaped, so
 *  string literals appear as &quot;...&quot;. We use placeholder markers
 *  (control chars) for inserted spans to avoid the regex passes matching
 *  digits/keywords inside style="..." attributes of previously-inserted spans. */
function highlightJava(escaped: string): string {
  const subs: string[] = [];
  const ph = (html: string): string => {
    const id = `${encodeIdx(subs.length)}`;
    subs.push(html);
    return id;
  };

  let out = escaped;

  // String literals (&quot;...&quot;) — wrap whole span first so inner
  // contents don't get colored as numbers/keywords.
  out = out.replace(
    /(&quot;)([^&]*?)(&quot;)/g,
    (m) => ph(`<span style="${JAVA.str}">${m}</span>`),
  );

  // JR expression refs: $F{...}, $P{...}, $V{...}, $R{...}.
  out = out.replace(
    /(\$[FPVR])\{([^}]*?)\}/g,
    (_m, pre: string, name: string) =>
      ph(
        `<span style="${JAVA.jrPrefix}">${pre}</span>` +
          `{<span style="${JAVA.jrName}">${name}</span>}`,
      ),
  );

  // Numbers (decimal, with optional fractional + Java suffix).
  out = out.replace(
    /\b(\d+(?:\.\d+)?[fFdDlL]?)\b/g,
    (m) => ph(`<span style="${JAVA.num}">${m}</span>`),
  );

  // Identifiers — split into keywords / types / plain idents.
  out = out.replace(/\b([a-zA-Z_][\w]*)\b/g, (m, word: string) => {
    if (JAVA_KEYWORDS.has(word))
      return ph(`<span style="${JAVA.kw}">${word}</span>`);
    if (JAVA_TYPES.has(word))
      return ph(`<span style="${JAVA.type}">${word}</span>`);
    return word;
  });

  // Resolve placeholders.
  out = out.replace(/([A-Z]+)/g, (_m, idx: string) => subs[decodeIdx(idx)]!);
  return out;
}

function encodeIdx(n: number): string {
  // Bijective base-26 (A=1, AA=27, ...).
  let s = '';
  let v = n + 1;
  while (v > 0) {
    v -= 1;
    s = String.fromCharCode(65 + (v % 26)) + s;
    v = Math.floor(v / 26);
  }
  return s;
}

function decodeIdx(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n - 1;
}
